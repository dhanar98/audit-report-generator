import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const syncItems = await req.json();

    if (!Array.isArray(syncItems)) {
      return NextResponse.json({ error: 'Payload must be an array of sync items.' }, { status: 400 });
    }

    const results = [];

    // Setup helper records (Organization, Role, default User) if not present
    let defaultOrg = await prisma.organization.findFirst();
    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: { name: 'Default Organization' },
      });
    }

    let defaultRole = await prisma.role.findUnique({ where: { name: 'AUDITOR' } });
    if (!defaultRole) {
      defaultRole = await prisma.role.create({
        data: { name: 'AUDITOR' },
      });
    }

    for (const item of syncItems) {
      const { id, type, data } = item;
      try {
        if (type === 'publish_template') {
          const isV2 = data.version === 2 || ('components' in data);

          if (isV2) {
            // Sync Dynamic Template V2
            await prisma.checklist.upsert({
              where: { id: data.id },
              update: {
                title: data.title,
                description: data.description || '',
                version: data.version || 2,
                status: 'Published',
                componentsJson: JSON.stringify(data.components || []),
              },
              create: {
                id: data.id,
                title: data.title,
                description: data.description || '',
                version: data.version || 2,
                status: 'Published',
                componentsJson: JSON.stringify(data.components || []),
              },
            });
          } else {
            // Sync Standard Template V1
            await prisma.$transaction(async (tx) => {
              // 1. Create/Update Checklist
              await tx.checklist.upsert({
                where: { id: data.id },
                update: {
                  title: data.title,
                  description: data.description || '',
                  version: data.version || 1,
                  status: 'Published',
                },
                create: {
                  id: data.id,
                  title: data.title,
                  description: data.description || '',
                  version: data.version || 1,
                  status: 'Published',
                },
              });

              // 2. Clear old template fields to overwrite
              const oldSections = await tx.templateSection.findMany({
                where: { checklistId: data.id },
                select: { id: true },
              });
              const oldSectionIds = oldSections.map((s) => s.id);

              await tx.templateField.deleteMany({ where: { sectionId: { in: oldSectionIds } } });
              await tx.templateTable.deleteMany({ where: { sectionId: { in: oldSectionIds } } });
              await tx.templateSection.deleteMany({ where: { checklistId: data.id } });

              // 3. Insert new sections, fields, tables
              if (Array.isArray(data.sections)) {
                for (const section of data.sections) {
                  const createdSec = await tx.templateSection.create({
                    data: {
                      id: section.id,
                      checklistId: data.id,
                      title: section.title,
                      description: section.description || '',
                      orderIndex: section.orderIndex || 0,
                      type: section.type || 'checklist',
                    },
                  });

                  if (Array.isArray(section.fields)) {
                    for (const field of section.fields) {
                      await tx.templateField.create({
                        data: {
                          id: field.id,
                          sectionId: createdSec.id,
                          title: field.title,
                          type: field.type,
                          required: field.required || false,
                          riskLevel: field.riskLevel || 'LOW',
                          recoMapping: field.recoMapping || null,
                          orderIndex: field.orderIndex || 0,
                        },
                      });
                    }
                  }

                  if (Array.isArray(section.tables)) {
                    for (const table of section.tables) {
                      await tx.templateTable.create({
                        data: {
                          id: table.id,
                          sectionId: createdSec.id,
                          title: table.title,
                          columnsJson: JSON.stringify(table.columns || []),
                          rowsJson: JSON.stringify(table.rows || []),
                          orderIndex: table.orderIndex || 0,
                        },
                      });
                    }
                  }
                }
              }
            });
          }
        } else if (type === 'save_session') {
          const isV2 = 'schemaId' in data || !('checklistId' in data);
          const checklistId = isV2 ? data.schemaId : data.checklistId;

          // 1. Ensure template exists in database
          let checklist = await prisma.checklist.findUnique({ where: { id: checklistId } });
          if (!checklist) {
            checklist = await prisma.checklist.create({
              data: {
                id: checklistId,
                title: isV2 ? 'Dynamic Checklist' : 'Standard Checklist',
                version: isV2 ? 2 : 1,
              },
            });
          }

          // 2. Ensure Client exists
          const clientName = data.clientName || 'Default Client';
          let client = await prisma.client.findFirst({
            where: { name: clientName, organizationId: defaultOrg.id },
          });
          if (!client) {
            client = await prisma.client.create({
              data: {
                name: clientName,
                organizationId: defaultOrg.id,
              },
            });
          }

          // 3. Ensure Site exists
          const siteName = data.siteName || 'Default Site';
          let site = await prisma.site.findFirst({
            where: { name: siteName, clientId: client.id },
          });
          if (!site) {
            site = await prisma.site.create({
              data: {
                name: siteName,
                address: data.siteAddress || '',
                clientId: client.id,
              },
            });
          }

          // 4. Ensure Auditor/User exists
          const auditorName = data.auditorName || 'Default Auditor';
          let user = await prisma.user.findFirst({
            where: { name: auditorName, organizationId: defaultOrg.id },
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: `${auditorName.toLowerCase().replace(/\s+/g, '_')}@example.com`,
                name: auditorName,
                passwordHash: 'dummy-hash-offline-sync',
                organizationId: defaultOrg.id,
                roleId: defaultRole.id,
              },
            });
          }

          // 5. Upsert Session
          if (isV2) {
            await prisma.auditSession.upsert({
              where: { id: data.id },
              update: {
                checklistId,
                siteId: site.id,
                auditorId: user.id,
                status: data.status,
                startedAt: new Date(data.startedAt),
                completedAt: data.completedAt ? new Date(data.completedAt) : null,
                responsesJson: JSON.stringify(data.responses || []),
              },
              create: {
                id: data.id,
                checklistId,
                siteId: site.id,
                auditorId: user.id,
                status: data.status,
                startedAt: new Date(data.startedAt),
                completedAt: data.completedAt ? new Date(data.completedAt) : null,
                responsesJson: JSON.stringify(data.responses || []),
              },
            });
          } else {
            await prisma.$transaction(async (tx) => {
              await tx.auditSession.upsert({
                where: { id: data.id },
                update: {
                  checklistId,
                  siteId: site.id,
                  auditorId: user.id,
                  status: data.status,
                  startedAt: new Date(data.startedAt),
                  completedAt: data.completedAt ? new Date(data.completedAt) : null,
                },
                create: {
                  id: data.id,
                  checklistId,
                  siteId: site.id,
                  auditorId: user.id,
                  status: data.status,
                  startedAt: new Date(data.startedAt),
                  completedAt: data.completedAt ? new Date(data.completedAt) : null,
                },
              });

              // Clean up existing responses & photos
              await tx.response.deleteMany({ where: { sessionId: data.id } });
              await tx.photo.deleteMany({ where: { sessionId: data.id } });

              // Sync responses
              if (Array.isArray(data.responses)) {
                for (const resp of data.responses) {
                  // Ensure field exists
                  let field = await tx.templateField.findUnique({ where: { id: resp.fieldId } });
                  if (!field) {
                    // Create dummy field to prevent foreign key issues
                    // Find or create a default section for orphan fields
                    let section = await tx.templateSection.findFirst({ where: { checklistId } });
                    if (!section) {
                      section = await tx.templateSection.create({
                        data: {
                          checklistId,
                          title: 'Default Section',
                          orderIndex: 0,
                        },
                      });
                    }
                    field = await tx.templateField.create({
                      data: {
                        id: resp.fieldId,
                        sectionId: section.id,
                        title: 'Orphan Field (Offline)',
                        type: 'text',
                        orderIndex: 0,
                      },
                    });
                  }

                  await tx.response.create({
                    data: {
                      id: resp.id || undefined,
                      sessionId: data.id,
                      fieldId: resp.fieldId,
                      value: resp.value || '',
                      remarks: resp.remarks || null,
                      recommendation: resp.recommendation || null,
                      status: resp.status || 'Open',
                    },
                  });
                }
              }

              // Sync photos
              if (Array.isArray(data.photos)) {
                for (const photo of data.photos) {
                  await tx.photo.create({
                    data: {
                      id: photo.id || undefined,
                      sessionId: data.id,
                      fileName: photo.fileName,
                      mimeType: photo.mimeType,
                      base64Data: photo.base64Data,
                      caption: photo.caption || null,
                    },
                  });
                }
              }
            });
          }
        }

        results.push({ id, status: 'success' });
      } catch (err: any) {
        console.error(`Failed to sync item ${id}:`, err);
        results.push({ id, status: 'failed', error: err.message || 'Database write error' });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json({ error: error.message || 'Sync failed.' }, { status: 500 });
  }
}
