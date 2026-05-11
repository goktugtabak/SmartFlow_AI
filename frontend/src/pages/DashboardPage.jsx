import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useApiData } from '../hooks/useApiData.jsx';
import { useToast, useDashNote, useMailModal, useNavBadge } from '../components/Layout.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { Badge } from '../components/Badge.jsx';
import { PriorityChip } from '../components/PriorityChip.jsx';
import { StockBar } from '../components/StockBar.jsx';
import { generateBriefing, updateTaskStatus } from '../api/client.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function DashNotes() {
  const { dashNotes, removeDashNote } = useDashNote();
  if (!dashNotes.length) return null;
  return (
    <div className="dash-notes">
      {dashNotes.map(n => (
        <div key={n.id} className="dnote">
          <span>🔔</span>
          <span>{n.msg}</span>
          <button className="dnote-close" onClick={() => removeDashNote(n.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { summary, tasks, orders, products, shipments, loading, refresh } = useApiData();
  const showToast = useToast();
  const { pushDashNote } = useDashNote();
  const openMailModal = useMailModal();
  const { setNavBadge } = useNavBadge();

  const [briefing, setBriefing] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  useEffect(() => {
    if (!summary) return;
    const late = orders.filter(o => o.cargo_status === 'Gecikmiş').length;
    const crit = products.filter(p => p.stock_count <= p.critical_threshold).length;
    const pend = localTasks.filter(t => t.status === 'Onay Bekliyor').length;
    setNavBadge({ late, crit, pend });
  }, [summary, orders, products, localTasks, setNavBadge]);

  useEffect(() => {
    loadBriefing();
  }, []);

  async function loadBriefing(manual = false) {
    setBriefLoading(true);
    const data = await generateBriefing();
    setBriefing(data);
    setBriefLoading(false);
    if (manual) showToast(data ? '✅ Brifing güncellendi' : 'ℹ️ API yok — fallback', data ? 'success' : 'info');
  }

  async function handleApprove(taskId) {
    const res = await updateTaskStatus(taskId, 'Tamamlandı');
    if (res) {
      setLocalTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'Tamamlandı' } : t));
      showToast(`✅ Görev #${taskId} onaylandı`, 'success');
      const t = localTasks.find(x => x.task_id === taskId);
      if (t) pushDashNote(`✅ Görev #${taskId} onaylandı: "${t.description}"`);
    }
  }

  async function handleReject(taskId) {
    const res = await updateTaskStatus(taskId, 'İptal');
    if (res) {
      setLocalTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'İptal' } : t));
      showToast(`✕ Görev #${taskId} reddedildi`, 'warn');
    }
  }

  const lateOrders = orders.filter(o => o.cargo_status === 'Gecikmiş');
  const critProds = products.filter(p => p.stock_count <= p.critical_threshold);
  const pendTasks = localTasks.filter(t => t.status === 'Onay Bekliyor');
  const pend = pendTasks.length;

  const typeIc = { Stok: '⚡', Kargo: '🚚', 'Müşteri Bilgilendirme': '📣', Paketleme: '📦' };

  const chartData = {
    labels: ['Teslim', 'Kargoda', 'Hazırlanıyor', 'Gecikmiş'],
    datasets: [{
      data: summary
        ? [summary.delivered_orders, summary.in_cargo_orders, summary.preparing_orders, summary.delayed_orders]
        : [0, 0, 0, 0],
      backgroundColor: ['#22c55e22', '#3b82f622', '#eab30822', '#ef444422'],
      borderColor: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'],
      borderWidth: 1.5,
      hoverOffset: 5,
    }],
  };

  const chartOptions = {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#64748b',
          font: { family: "'IBM Plex Mono',monospace", size: 10 },
          padding: 14, boxWidth: 10, boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: '#13161d', borderColor: '#1f2330', borderWidth: 1,
        titleColor: '#e2e8f0', bodyColor: '#94a3b8',
        titleFont: { family: "'IBM Plex Mono',monospace", size: 11 },
        bodyFont: { family: "'IBM Plex Mono',monospace", size: 11 },
      },
    },
  };

  const shipMap = { 'Teslim Edildi': 'green', 'Dağıtımda': 'blue', 'Kargoya Verildi': 'cyan', Depoda: 'yellow', Gecikmiş: 'red' };

  return (
    <div className="page-content">
      <DashNotes />

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard icon="📦" value={summary?.total_orders} label="Toplam Sipariş" delta={summary ? `${summary.total_orders} sipariş` : '—'} deltaClass="d-neu" color="#64748b" />
        <StatCard icon="🔧" value={summary?.preparing_orders} label="Hazırlanıyor" delta={summary ? `${summary.preparing_orders} aktif` : '—'} deltaClass="d-neu" color="#eab308" />
        <StatCard icon="🚚" value={summary?.in_cargo_orders} label="Kargoda" delta={summary ? `${summary.in_cargo_orders} yolda` : '—'} deltaClass="d-neu" color="#06b6d4" />
        <StatCard icon="✅" value={summary?.delivered_orders} label="Teslim Edildi" delta={summary ? `+${Math.max(0, summary.delivered_orders - 8)} dün` : '—'} deltaClass="d-up" color="#22c55e" />
        <StatCard icon="⏰" value={summary?.delayed_orders} label="Gecikmiş" delta={summary?.delayed_orders > 0 ? '↑ acil' : 'normal'} deltaClass="d-down" color="#ef4444" />
        <StatCard icon="⚡" value={summary?.critical_stock_products} label="Kritik Stok" delta={summary?.critical_stock_products > 0 ? '↑ eşik' : 'normal'} deltaClass="d-warn" color="#f97316" />
        <StatCard icon="⏳" value={pend} label="Onay Bekliyor" delta={pend > 0 ? 'onay gerek' : 'temiz'} deltaClass="d-pur" color="#a855f7" />
      </div>

      {/* AI Briefing */}
      <div className="ai-panel fi">
        <div className="aihdr">
          <div className="ailbl">
            🤖 AI Günlük Brifing
            <span className="chip chip-blue">Gemini</span>
            <span className="chip chip-purple">generate_daily_briefing</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => loadBriefing(true)} disabled={briefLoading}>
            {briefLoading ? '…' : '↻ Yenile'}
          </button>
        </div>
        {briefLoading ? (
          <div className="brief-body loading">
            <div className="spinner" />
            <span>POST /api/ai/tasks/generate çağrılıyor…</span>
          </div>
        ) : (
          <div className="brief-body">
            {briefing?.briefing
              ? briefing.briefing.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)
              : summary?.ai_summary || 'Brifing yüklenemedi.'}
          </div>
        )}
        {briefing && !briefLoading && (
          <div className="bftr">
            <span className="bftr-meta">Son güncelleme: {new Date().toLocaleTimeString('tr')} · POST /api/ai/tasks/generate</span>
            <div className="tool-tags">
              {['get_order_status', 'check_stock_alerts', 'generate_daily_briefing'].map(t => (
                <span key={t} className="chip chip-purple">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gecikmiş + Kritik Stok */}
      <div className="two-col">
        <div>
          <div className="shdr">
            <div className="stitle">⏰ Gecikmiş Siparişler <span className="scnt">{lateOrders.length}</span></div>
          </div>
          <div className="alert-panel">
            {lateOrders.length === 0
              ? <div className="empty">✅ Gecikmiş sipariş yok</div>
              : lateOrders.map(o => (
                  <div key={o.order_id} className="ai-row">
                    <span className="ai-ic">🔴</span>
                    <div className="ai-bd">
                      <div className="ai-t">#{o.order_id} — {o.customer_name}</div>
                      <div className="ai-m">Adet: {o.quantity} · ETA: {o.estimated_delivery} · <span style={{ color: 'var(--red)' }}>{o.delay_days} gün gecikmiş</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Badge label="Gecikmiş" />
                      <button className="btn btn-ghost btn-sm" onClick={() => pushDashNote(`📦 #${o.order_id} — ${o.customer_name} için bilgilendirme aksiyonu oluşturuldu`)}>
                        Aksiyon
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        </div>
        <div>
          <div className="shdr">
            <div className="stitle">⚡ Kritik Stok Uyarısı <span className="scnt">{critProds.length}</span></div>
          </div>
          <div className="alert-panel">
            {critProds.length === 0
              ? <div className="empty">✅ Kritik stok yok</div>
              : critProds.map(p => (
                  <div key={p.product_id} className="ai-row">
                    <span className="ai-ic">⚡</span>
                    <div className="ai-bd">
                      <div className="ai-t">{p.product_name}</div>
                      <div className="ai-m">{p.product_id} · Stok: <span style={{ color: 'var(--red)' }}>{p.stock_count}</span> / Min: {p.critical_threshold}</div>
                      <StockBar stock={p.stock_count} threshold={p.critical_threshold} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const body = `Sayın Tedarikçi Yetkilisi,\n\n"${p.product_name}" (${p.product_id}) ürünümüzün stoğu kritik seviyeye düşmüştür.\n\nMevcut stok: ${p.stock_count} adet\nKritik eşik: ${p.critical_threshold} adet\n\nEn kısa sürede fiyat ve teslim süresi bilgisini paylaşabilir misiniz?\n\nSaygılarımla,\nSatın Alma — SmartFlow AI`;
                      openMailModal(p.product_name, p.supplier_email, `ACİL: ${p.product_name} — Stok Yenileme Talebi`, body);
                    }}>✉️</button>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Onay Bekleyenler */}
      <div>
        <div className="shdr">
          <div className="stitle">⏳ Onay Bekleyen Aksiyonlar <span className="scnt">{pend}</span></div>
        </div>
        <div className="action-panel">
          {pendTasks.length === 0
            ? <div className="empty">✅ Onay bekleyen aksiyon yok</div>
            : pendTasks.map(t => (
                <div key={t.task_id} className="act">
                  <span style={{ fontSize: 18 }}>{typeIc[t.task_type] || '📋'}</span>
                  <div className="act-l">
                    <div className="act-t">{t.description}</div>
                    <div className="act-s">{t.task_type} · <Badge label="Onay Bekliyor" /></div>
                  </div>
                  <div className="act-r">
                    <PriorityChip priority={t.priority} />
                    <button className="btn btn-ghost btn-sm" onClick={() => handleReject(t.task_id)}>✕</button>
                    <button className="btn btn-purple btn-sm" onClick={() => handleApprove(t.task_id)}>✓ Onayla</button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Son Kargolar + Chart */}
      <div className="two-col">
        <div>
          <div className="shdr">
            <div className="stitle">🚚 Son Kargolar</div>
          </div>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Takip No</th><th>Sipariş</th><th>Firma</th><th>Durum</th><th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 5).map(s => (
                  <tr key={s.shipment_id}>
                    <td className="cm">{s.tracking_number}</td>
                    <td className="cb">#{s.order_id}</td>
                    <td className="cm">{s.carrier}</td>
                    <td><Badge label={s.actual_status} color={shipMap[s.actual_status] || 'gray'} /></td>
                    <td className="cm">{s.estimated_delivery}</td>
                  </tr>
                ))}
                {shipments.length === 0 && <tr><td colSpan={5} className="empty">Yükleniyor…</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="shdr"><div className="stitle">📊 Sipariş Dağılımı</div></div>
          <div className="alert-panel" style={{ padding: 16 }}>
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
