import { DynamicChecklistSchema } from '@/types/dynamicSchema';

export const COMPREHENSIVE_DYNAMIC_SCHEMA: DynamicChecklistSchema = {
  id: 'dyn_template_001',
  title: 'Enterprise Safety & Facility Audit Checklist',
  description: 'Multi-domain compliance, safety, and operations review checklist.',
  version: 2,
  components: [
    {
      id: 'comp_header',
      type: 'header',
      title: 'Facility Safety & Infrastructure Inspection',
      subtitle: 'Dynamic Schema v2 Engine',
      description: 'Perform walk-through inspections, log safety findings, and document corrections.',
      category: 'Safety & Facilities',
      riskLevel: 'HIGH'
    },
    {
      id: 'comp_dropdowns',
      type: 'dynamic_dropdown',
      title: 'Audit Logistics & Personnel Assignment',
      sourceType: 'client',
      required: true
    },
    {
      id: 'comp_rich_info',
      type: 'rich_content',
      title: 'Instructions',
      content: '<strong>INSTRUCTIONS:</strong> Verify all assets listed in the grid log. Ensure any failures are detailed with recommendation timelines. Photo evidence is required for all violations.'
    },
    {
      id: 'comp_checklist_1',
      type: 'checklist',
      title: 'Fire Safety & Emergency Systems',
      items: [
        {
          id: 'chk_1_1',
          question: 'Are all exit passageways, fire doors, and escape routes completely clear of obstructions?',
          riskLevel: 'HIGH',
          targetResolveDays: 1,
          required: true
        },
        {
          id: 'chk_1_2',
          question: 'Is the central fire alarm control panel fully operational and showing clear statuses?',
          riskLevel: 'HIGH',
          targetResolveDays: 3,
          required: true
        },
        {
          id: 'chk_1_3',
          question: 'Are emergency exit signs and floor-level pathway strip lighting illuminated correctly?',
          riskLevel: 'MEDIUM',
          targetResolveDays: 7,
          required: false
        }
      ]
    },
    {
      id: 'comp_grid',
      type: 'table_grid',
      title: 'Portable Extinguisher Registry & Pressure Log',
      columns: [
        { id: 'col_loc', header: 'Location / Zone', type: 'text' },
        { id: 'col_id', header: 'Extinguisher ID', type: 'text' },
        { id: 'col_type', header: 'Type', type: 'dropdown', options: ['CO2', 'Water', 'Dry Chemical', 'Wet Chemical'] },
        { id: 'col_psi', header: 'PSI Value', type: 'number', calculation: 'AVG' },
        { id: 'col_status', header: 'Status Checks', type: 'yes_no' },
        { id: 'col_inspected', header: 'Last Tested Date', type: 'date' }
      ],
      defaultRowCount: 3,
      stickyHeader: true
    },
    {
      id: 'comp_yes_no_gen',
      type: 'yes_no_na',
      title: 'Did local site management host the audit kick-off meeting?',
      labels: { yes: 'Conducted', no: 'Not Conducted', na: 'Waived' },
      scores: { yes: 10, no: 0, na: 5 },
      colors: { yes: '#10b981', no: '#ef4444', na: '#64748b' },
      recoMapping: { no: 'Audit Kick-off must be completed for all sites.' },
      required: true
    },
    {
      id: 'comp_obs',
      type: 'observation',
      title: 'Auditor Remarks & Corrective Scope',
      question: 'Detail any structural observations or comments related to safety culture at this branch.',
      placeholder: 'Enter facility observation scope details...',
      allowImage: true,
      required: false
    },
    {
      id: 'comp_sig',
      type: 'signature',
      title: 'Inspector Verification & Signature Lock',
      placeholder: 'Authorized Lead Sign-off',
      required: true
    }
  ]
};
