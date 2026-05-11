import React, { useState } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Badge } from '../components/Badge.jsx';

export default function ShipmentsPage() {
  const { shipments } = useApiData();
  const [filter, setFilter] = useState('');

  const rows = shipments.filter(s => !filter || s.actual_status === filter);

  return (
    <div className="page-content">
      <div className="shdr">
        <div className="stitle">🚚 Kargolar <span className="scnt">{rows.length}</span></div>
        <div className="filter-bar">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="Teslim Edildi">Teslim Edildi</option>
            <option value="Dağıtımda">Dağıtımda</option>
            <option value="Kargoya Verildi">Kargoya Verildi</option>
            <option value="Gecikmiş">Gecikmiş</option>
            <option value="Depoda">Depoda</option>
          </select>
        </div>
      </div>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Kargo ID</th><th>Sipariş</th><th>Firma</th><th>Takip No</th>
              <th>Durum</th><th>Son Konum</th><th>Gecikme (gün)</th><th>ETA</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={8} className="empty">Sonuç yok.</td></tr>
              : rows.map(s => (
                  <tr key={s.shipment_id}>
                    <td className="cm">#{s.shipment_id}</td>
                    <td className="cm">#{s.order_id}</td>
                    <td className="cm">{s.carrier}</td>
                    <td className="cm">{s.tracking_number}</td>
                    <td><Badge label={s.actual_status} /></td>
                    <td className="cm">{s.last_location}</td>
                    <td>
                      {s.delay_days > 0
                        ? <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>+{s.delay_days}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="cm">{s.estimated_delivery}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
