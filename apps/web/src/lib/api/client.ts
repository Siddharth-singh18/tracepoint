const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchCases() {
  const res = await fetch(`${BASE_URL}/cases`);
  return res.json();
}

export async function createCase(title: string, description?: string) {
  const res = await fetch(`${BASE_URL}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  return res.json();
}

export async function getCaseDetails(caseId: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}`);
  return res.json();
}

export async function seedDemoCase() {
  const res = await fetch(`${BASE_URL}/cases/seed-demo`, {
    method: 'POST'
  });
  return res.json();
}

export async function uploadFile(caseId: string, file: File, fileType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  formData.append('timezone', 'Asia/Kolkata');

  const res = await fetch(`${BASE_URL}/cases/${caseId}/files`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function triggerIngest(fileId: string, mapping?: any) {
  const res = await fetch(`${BASE_URL}/files/${fileId}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapping })
  });
  return res.json();
}

export async function getTopContacts(caseId: string, number?: string) {
  const url = number 
    ? `${BASE_URL}/cases/${caseId}/analytics/top-contacts?number=${encodeURIComponent(number)}`
    : `${BASE_URL}/cases/${caseId}/analytics/top-contacts`;
  const res = await fetch(url);
  return res.json();
}

export async function getCommonContacts(caseId: string, suspects: string[]) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/analytics/common-contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspects })
  });
  return res.json();
}

export async function getGraphData(caseId: string, selectedNumbers?: string[]) {
  const param = selectedNumbers && selectedNumbers.length > 0
    ? `?selected_numbers=${encodeURIComponent(selectedNumbers.join(','))}`
    : '';
  const res = await fetch(`${BASE_URL}/cases/${caseId}/graph${param}`);
  return res.json();
}

export async function getTowerTimeline(caseId: string, number?: string) {
  const url = number
    ? `${BASE_URL}/cases/${caseId}/timeline/tower?number=${encodeURIComponent(number)}`
    : `${BASE_URL}/cases/${caseId}/timeline/tower`;
  const res = await fetch(url);
  return res.json();
}

export async function getDeviceLinks(caseId: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/analytics/device-links`);
  return res.json();
}

export async function correlateIPDR(caseId: string, target?: string) {
  const param = target ? `?ip_or_subscriber=${encodeURIComponent(target)}` : '';
  const res = await fetch(`${BASE_URL}/cases/${caseId}/analytics/ipdr-correlate${param}`, {
    method: 'POST'
  });
  return res.json();
}

export async function askCopilot(caseId: string, query: string) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/copilot/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

export async function generateReport(caseId: string, format: 'pdf' | 'excel' = 'pdf') {
  const res = await fetch(`${BASE_URL}/cases/${caseId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format })
  });
  return res.json();
}
