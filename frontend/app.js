const state = {
  overview: null,
  kpiSeries: null,
  campaigns: [],
  alerts: [],
  integrations: [],
  reports: [],
  activity: []
};

const fetchJson = async (endpoint) => {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('de-DE');

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const shortDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit'
});

const createStatusPill = (text) => {
  const pill = document.createElement('span');
  pill.className = 'status-pill';
  pill.textContent = text;
  return pill;
};

const renderOverview = () => {
  if (!state.overview) return;
  const statusBar = document.getElementById('statusBar');
  statusBar.innerHTML = '';
  statusBar.append(
    createStatusPill(`Reporting Window: ${state.overview.period}`),
    createStatusPill(`Last Sync: ${dateFormatter.format(new Date(state.overview.updatedAt))}`)
  );

  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = '';
  state.overview.kpiSummary.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'kpi-card';

    const title = document.createElement('h3');
    title.textContent = entry.label;
    const value = document.createElement('div');
    value.className = 'value';
    const formatted = entry.unit === '€' ? euroFormatter.format(entry.value) : numberFormatter.format(entry.value);
    value.innerHTML = entry.unit && entry.unit !== '€'
      ? `${formatted} <small>${entry.unit}</small>`
      : formatted;

    const goalRow = state.overview.goalPerformance.find((goal) => goal.metric === entry.label.split(' ')[0]);
    if (goalRow) {
      const delta = goalRow.actual - goalRow.target;
      const trend = document.createElement('p');
      trend.className = 'muted';
      const sign = delta >= 0 ? '+' : '';
      trend.textContent = `${sign}${numberFormatter.format(delta)} vs Ziel (${numberFormatter.format(goalRow.target)})`;
      card.append(title, value, trend);
    } else {
      card.append(title, value);
    }

    kpiGrid.appendChild(card);
  });

  const chartPeriod = document.getElementById('chartPeriod');
  chartPeriod.textContent = `Updated ${dateFormatter.format(new Date(state.overview.updatedAt))}`;
};

const renderChart = () => {
  if (!state.kpiSeries) return;
  const canvas = document.getElementById('kpiChart');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const padding = 60;
  const colors = ['#38bdf8', '#34d399', '#c084fc'];
  const maxValue = Math.max(
    ...state.kpiSeries.flatMap((series) => series.points.map((point) => point.value))
  );

  const minValue = 0;
  const yScale = (height - padding * 2) / (maxValue - minValue || 1);
  const xCount = state.kpiSeries[0]?.points.length || 0;
  const xStep = (width - padding * 2) / Math.max(xCount - 1, 1);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding + ((height - padding * 2) / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    const value = maxValue - ((maxValue - minValue) / gridLines) * i;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(euroFormatter.format(value), 10, y + 4);
  }

  const labels = state.kpiSeries[0]?.points.map((point) => point.date) ?? [];
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  labels.forEach((label, index) => {
    const x = padding + xStep * index;
    ctx.fillText(shortDateFormatter.format(new Date(label)), x, height - padding + 24);
  });

  state.kpiSeries.forEach((series, idx) => {
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors[idx % colors.length];
    series.points.forEach((point, index) => {
      const x = padding + xStep * index;
      const y = height - padding - (point.value - minValue) * yScale;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    series.points.forEach((point, index) => {
      const x = padding + xStep * index;
      const y = height - padding - (point.value - minValue) * yScale;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  const legendX = width - padding - 140;
  let legendY = padding - 20;
  ctx.font = '14px Inter, sans-serif';
  state.kpiSeries.forEach((series, idx) => {
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(legendX, legendY, 14, 14);
    ctx.fillStyle = '#cbd5f5';
    ctx.fillText(series.name, legendX + 20, legendY + 12);
    legendY += 22;
  });
};

const renderAlerts = () => {
  const list = document.getElementById('alertList');
  list.innerHTML = '';
  state.alerts.forEach((alert) => {
    const item = document.createElement('li');
    item.className = 'alert-card';
    item.dataset.severity = alert.severity;

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = alert.title;

    const description = document.createElement('p');
    description.textContent = alert.description;

    const time = document.createElement('div');
    time.className = 'time';
    time.textContent = dateFormatter.format(new Date(alert.time));

    const action = document.createElement('div');
    action.className = 'muted';
    action.textContent = alert.action;

    item.append(title, description, action, time);
    list.appendChild(item);
  });
};

const renderIntegrations = () => {
  const list = document.getElementById('integrationList');
  list.innerHTML = '';
  state.integrations.forEach((integration) => {
    const item = document.createElement('li');
    item.className = 'integration-item';

    const label = document.createElement('div');
    label.innerHTML = `<strong>${integration.name}</strong><br/><span class="muted">Last sync ${dateFormatter.format(new Date(integration.lastSync))}</span>`;

    const status = document.createElement('span');
    status.className = `status ${integration.status}`;
    status.textContent = integration.status;

    item.append(label, status);
    list.appendChild(item);
  });
};

const renderCampaigns = () => {
  const tbody = document.querySelector('#campaignTable tbody');
  tbody.innerHTML = '';
  state.campaigns.forEach((campaign) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${campaign.name}</strong></td>
      <td>${campaign.channel}</td>
      <td>${campaign.status}</td>
      <td class="numeric">${euroFormatter.format(campaign.spend)}</td>
      <td class="numeric">${euroFormatter.format(campaign.revenue)}</td>
      <td class="numeric">${campaign.roas.toFixed(2)}x</td>
      <td>${campaign.owner}</td>
      <td>${campaign.trend}</td>
    `;
    tbody.appendChild(tr);
  });
};

const renderReports = () => {
  const list = document.getElementById('reportList');
  list.innerHTML = '';
  state.reports.forEach((report) => {
    const item = document.createElement('li');
    item.className = 'report-item';

    const header = document.createElement('div');
    header.innerHTML = `<strong>${report.name}</strong> · ${report.format}`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${report.frequency}</span><span>${dateFormatter.format(new Date(report.nextRun))}</span>`;

    const recipients = document.createElement('div');
    recipients.className = 'muted';
    recipients.textContent = report.recipients.join(', ');

    item.append(header, meta, recipients);
    list.appendChild(item);
  });
};

const renderActivity = () => {
  const list = document.getElementById('activityList');
  list.innerHTML = '';
  state.activity.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'activity-item';

    const header = document.createElement('div');
    header.innerHTML = `<strong>${entry.message}</strong>`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<span>${entry.type}</span><span>${dateFormatter.format(new Date(entry.time))}</span>`;

    item.append(header, meta);
    list.appendChild(item);
  });
};

const loadDashboard = async () => {
  document.getElementById('refresh').disabled = true;
  try {
    const [overview, kpis, campaigns, alerts, integrations, reports, activity] = await Promise.all([
      fetchJson('/api/overview'),
      fetchJson('/api/kpis'),
      fetchJson('/api/campaigns'),
      fetchJson('/api/alerts'),
      fetchJson('/api/integrations'),
      fetchJson('/api/reports'),
      fetchJson('/api/activity')
    ]);

    state.overview = overview;
    state.kpiSeries = kpis.series;
    state.campaigns = campaigns.items;
    state.alerts = alerts.items;
    state.integrations = integrations.items;
    state.reports = reports.items;
    state.activity = activity.items;

    renderOverview();
    renderChart();
    renderAlerts();
    renderIntegrations();
    renderCampaigns();
    renderReports();
    renderActivity();
  } catch (error) {
    console.error(error);
    alert('Daten konnten nicht geladen werden. Bitte erneut versuchen.');
  } finally {
    document.getElementById('refresh').disabled = false;
  }
};

const toggleTheme = (enabled) => {
  document.body.classList.toggle('light', !enabled);
};

document.addEventListener('DOMContentLoaded', () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('light', !prefersDark);

  const toggle = document.getElementById('themeToggle');
  toggle.checked = prefersDark;
  toggle.addEventListener('change', (event) => toggleTheme(event.target.checked));

  document.getElementById('refresh').addEventListener('click', () => loadDashboard());

  loadDashboard();
});
