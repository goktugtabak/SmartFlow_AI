import React, { useState } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Badge } from '../components/Badge.jsx';

export default function OrdersPage() {
  const { orders } = useApiData();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCargo, setFilterCargo] = useState('');

  const rows = orders.filter(o =>
    (!filterStatus || o.status === filterStatus) &&
    (!filterCargo || o.cargo_status === filterCargo)
  );

  return (
    <div className="page-content">
      <div className="shdr">
        <div className="stitle">📦 Siparişler <span className="scnt">{rows.length}</span></div>
        <div className="filter-bar">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="Hazırlanıyor">Hazırlanıyor</option>
            <option value="Kargoda">Kargoda</option>
            <option value="Teslim Edildi">Teslim Edildi</option>
          </select>
          <select value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
            <option value="">Tüm Kargo</option>
            <option value="Gecikmiş">Gecikmiş</option>
            <option value="Zamanında">Zamanında</option>
            <option value="Dağıtımda">Dağıtımda</option>
          </select>
        </div>
      </div>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Sipariş ID</th><th>Müşteri</th><th>Ürün</th>
              <th>Adet</th><th>Durum</th><th>Kargo Durumu</th>
              <th>Tahmini Teslimat</th><th>Gecikme</th><th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={9} className="empty">Sonuç yok.</td></tr>
              : rows.map(o => (
                  <tr key={o.order_id}>
                    <td className="cm">#{o.order_id}</td>
                    <td className="cb">{o.customer_name}</td>
                    <td className="cm">{o.product_id}</td>
                    <td className="cm">{o.quantity}</td>
                    <td><Badge label={o.status} /></td>
                    <td><Badge label={o.cargo_status} /></td>
                    <td className="cm">{o.estimated_delivery}</td>
                    <td>
                      {o.delay_days > 0
                        ? <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 11 }}>+{o.delay_days}g</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="cm">{o.created_at ? new Date(o.created_at).toLocaleDateString('tr') : '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
