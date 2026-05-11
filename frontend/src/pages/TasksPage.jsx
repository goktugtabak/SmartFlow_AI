import React, { useState, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Badge } from '../components/Badge.jsx';
import { PriorityChip } from '../components/PriorityChip.jsx';
import { useToast } from '../components/Layout.jsx';
import { updateTaskStatus } from '../api/client.js';

const TYPE_CLS = {
  'Müşteri Bilgilendirme': 'red',
  Paketleme: 'cyan',
  Stok: 'orange',
  Kargo: 'blue',
};

export default function TasksPage() {
  const { tasks, refresh } = useApiData();
  const showToast = useToast();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPri, setFilterPri] = useState('');

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const rows = localTasks.filter(t =>
    (!filterStatus || t.status === filterStatus) &&
    (!filterType || t.task_type === filterType) &&
    (!filterPri || t.priority === filterPri)
  );

  async function handleApprove(taskId) {
    const res = await updateTaskStatus(taskId, 'Tamamlandı');
    if (res) {
      setLocalTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: 'Tamamlandı' } : t));
      showToast(`✅ Görev #${taskId} onaylandı`, 'success');
    }
  }

  return (
    <div className="page-content">
      <div className="shdr">
        <div className="stitle">📋 Görevler <span className="scnt">{rows.length}</span></div>
        <div className="filter-bar">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="Bekliyor">Bekliyor</option>
            <option value="Devam Ediyor">Devam Ediyor</option>
            <option value="Onay Bekliyor">Onay Bekliyor</option>
            <option value="Tamamlandı">Tamamlandı</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tüm Türler</option>
            <option value="Müşteri Bilgilendirme">Müşteri Bilgilendirme</option>
            <option value="Paketleme">Paketleme</option>
            <option value="Stok">Stok</option>
            <option value="Kargo">Kargo</option>
          </select>
          <select value={filterPri} onChange={e => setFilterPri(e.target.value)}>
            <option value="">Tüm Öncelikler</option>
            <option value="Kritik">Kritik</option>
            <option value="Yüksek">Yüksek</option>
            <option value="Orta">Orta</option>
            <option value="Düşük">Düşük</option>
          </select>
        </div>
      </div>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Görev</th><th>Tür</th><th>İlişki</th>
              <th>Öncelik</th><th>Durum</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={7} className="empty">Sonuç yok.</td></tr>
              : rows.map(t => (
                  <tr key={t.task_id}>
                    <td className="cm">#{t.task_id}</td>
                    <td className="cb">{t.description}</td>
                    <td><Badge label={t.task_type} color={TYPE_CLS[t.task_type] || 'gray'} /></td>
                    <td className="cm">{t.related_order_id ? `#Sip-${t.related_order_id}` : t.related_product_id || '—'}</td>
                    <td><PriorityChip priority={t.priority} /></td>
                    <td><Badge label={t.status} /></td>
                    <td>
                      {t.status === 'Onay Bekliyor'
                        ? <button className="btn btn-purple btn-sm" onClick={() => handleApprove(t.task_id)}>✓ Onayla</button>
                        : <button className="btn btn-ghost btn-sm" onClick={() => showToast(`Görev #${t.task_id} — ${t.status}`, 'info')}>→</button>}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
