

async function testSync() {
  const mockPayload = [
    {
      id: 99998,
      type: 'save_session',
      data: {
        id: `session_v2_${Math.random().toString(36).substr(2, 9)}`,
        schemaId: `dyn_template_001`,
        clientName: 'Test V2 Client',
        siteName: 'Test Branch V2',
        siteAddress: '123 Main St',
        auditorName: 'Dhanasekaran Ravichandran',
        status: 'In_Progress',
        startedAt: new Date().toISOString(),
        responses: [
          {
            componentId: 'comp_checklist',
            checklistAnswers: [
              {
                itemId: 'item_01',
                value: 'YES',
                remarks: 'Verified'
              }
            ]
          }
        ]
      }
    }
  ];

  console.log("Sending mock sync payload to http://localhost:3001/api/sync...");
  try {
    const res = await fetch('http://localhost:3001/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    });

    console.log(`HTTP Status: ${res.status}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testSync();
