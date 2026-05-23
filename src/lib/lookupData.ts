export interface ClientData {
  id: string;
  name: string;
  sites: {
    id: string;
    name: string;
    address: string;
    auditors: {
      id: string;
      name: string;
      email: string;
    }[];
  }[];
}

export const LOOKUP_CLIENTS: ClientData[] = [
  {
    id: 'cli_1',
    name: 'Indian Bank',
    sites: [
      {
        id: 'site_1_1',
        name: 'Chennai Main Branch',
        address: 'No. 31, Rajaji Salai, Chennai - 600001',
        auditors: [
          { id: 'aud_1', name: 'Dhanasekaran Ravichandran', email: 'dhanasekaran@gmail.com' },
          { id: 'aud_2', name: 'Aravind Kumar', email: 'aravind@veriaudit.com' }
        ]
      },
      {
        id: 'site_1_2',
        name: 'Palayampatti Branch',
        address: 'P.K.S. Street, Palayampatti, Virudhunagar - 626112',
        auditors: [
          { id: 'aud_1', name: 'Dhanasekaran Ravichandran', email: 'dhanasekaran@gmail.com' },
          { id: 'aud_3', name: 'Meera Nair', email: 'meera@veriaudit.com' }
        ]
      }
    ]
  },
  {
    id: 'cli_2',
    name: 'State Bank of India',
    sites: [
      {
        id: 'site_2_1',
        name: 'Coimbatore Corporate Office',
        address: '1443, Trichy Road, Coimbatore - 641018',
        auditors: [
          { id: 'aud_2', name: 'Aravind Kumar', email: 'aravind@veriaudit.com' },
          { id: 'aud_3', name: 'Meera Nair', email: 'meera@veriaudit.com' }
        ]
      },
      {
        id: 'site_2_2',
        name: 'Madurai Branch',
        address: '82, West Tower Street, Madurai - 625001',
        auditors: [
          { id: 'aud_1', name: 'Dhanasekaran Ravichandran', email: 'dhanasekaran@creditmantri.com' }
        ]
      }
    ]
  },
  {
    id: 'cli_3',
    name: 'HDFC Bank Ltd',
    sites: [
      {
        id: 'site_3_1',
        name: 'Bengaluru Tech Park Site',
        address: 'Block B, RMZ Infinity, Old Madras Road, Bengaluru - 560016',
        auditors: [
          { id: 'aud_2', name: 'Aravind Kumar', email: 'aravind@veriaudit.com' },
          { id: 'aud_4', name: 'Sanjay Dutt', email: 'sanjay@veriaudit.com' }
        ]
      }
    ]
  }
];
