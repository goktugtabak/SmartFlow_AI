import React, { useState, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Badge } from '../components/Badge.jsx';
import { PriorityChip } from '../components/PriorityChip.jsx';
import { useToast, useDashNote } from '../components/Layout.jsx';
import { updateTaskStatus } from '../api/client.js';

const TYPE_IC = { Stok: '⚡', Kargo: '🚚', 'Müşteri Bilgilendirme': '📣', Paketleme: '📦' };

export default function PendingPage() {
  const { tasks } = useApiData();
  const showToast = useToast();
  const { pushDashNote } = useDashNote();
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const pending = localTasks.filter(t => t.status === 'Onay Bekliyor');

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

  async function handleApproveAll() {
    await Promise.all(pending.map(t => updateTaskStatus(t.task_id, 'Tamamlandı')));
    setLocalTasks(prev => prev.map(t => t.status === 'Onay Bekliyor' ? { ...t, status: 'Tamamlandı' } : t));
    showToast('✅ Tüm aksiyonlar onaylandı', 'success');
    pushDashNote('✅ Tüm bekleyen aksiyonlar onaylandı.');
  }

  return (
    <div className="page-content">
      <div className="shdr">
        <div className="stitle">⏳ Onay Bekleyen Aksiyonlar <span className="scnt">{pending.length}</span></div>
        <button className="btn btn-primary btn-sm" onClick={handleApproveAll} disabled={pending.length === 0}>
          ✅ Tümünü Onayla
        </button>
      </div>
      <div className="action-panel">
        {pending.length === 0
          ? <div className="empty">✅ Onay bekleyen aksiyon yok</div>
          : pending.map(t => (
              <div key={t.task_id} className="act">
                <span style={{ fontSize: 18 }}>{TYPE_IC[t.task_type] || '📋'}</span>
                <div className="act-l">
                  <div className="act-t">{t.description}</div>
                  <div className="act-s">{t.task_type} · <Badge label="Onay Bekliyor" /></div>
                </div>
                <div className="act-r">
                  <PriorityChip priority={t.priority} />
                  <button className="btn btn-ghost btn-sm" onClick={() => handleReject(t.task_id)}>✕ Reddet</button>
                  <button className="btn btn-purple btn-sm" onClick={() => handleApprove(t.task_id)}>✓ Onayla</button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
