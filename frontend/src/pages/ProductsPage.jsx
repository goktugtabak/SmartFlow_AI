import React, { useState } from 'react';
import { useApiData } from '../hooks/useApiData.jsx';
import { Badge } from '../components/Badge.jsx';
import { StockBar } from '../components/StockBar.jsx';
import { useMailModal } from '../components/Layout.jsx';

export default function ProductsPage() {
  const { products } = useApiData();
  const openMailModal = useMailModal();
  const [filter, setFilter] = useState('');

  const rows = products.filter(p => {
    if (filter === 'kritik') return p.stock_count <= p.critical_threshold;
    if (filter === 'normal') return p.stock_count > p.critical_threshold;
    return true;
  });

  function handleMailFor(p) {
    const body = `Sayın Tedarikçi Yetkilisi,\n\n"${p.product_name}" (${p.product_id}) ürünümüzün stoğu kritik seviyeye düşmüştür.\n\nMevcut stok: ${p.stock_count} adet\nKritik eşik: ${p.critical_threshold} adet\n\nEn kısa sürede fiyat ve teslim süresi bilgisini paylaşabilir misiniz?\n\nSaygılarımla,\nSatın Alma — SmartFlow AI`;
    openMailModal(p.product_name, p.supplier_email, `ACİL: ${p.product_name} — Stok Yenileme Talebi`, body);
  }

  return (
    <div className="page-content">
      <div className="shdr">
        <div className="stitle">🗃️ Ürünler <span className="scnt">{rows.length}</span></div>
        <div className="filter-bar">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tümü</option>
            <option value="kritik">Kritik Stok</option>
            <option value="normal">Normal Stok</option>
          </select>
        </div>
      </div>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Ürün ID</th><th>Ürün Adı</th><th>Fiyat</th>
              <th>Stok</th><th>Min Eşik</th><th>Stok Durumu</th>
              <th>Müsait</th><th>Tedarikçi</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={9} className="empty">Sonuç yok.</td></tr>
              : rows.map(p => {
                  const pct = Math.round(p.stock_count / p.critical_threshold * 100);
                  const col = pct < 10 ? 'var(--red)' : pct < 20 ? 'var(--orange)' : pct < 50 ? 'var(--yellow)' : 'var(--green)';
                  const isCrit = p.stock_count <= p.critical_threshold;
                  return (
                    <tr key={p.product_id}>
                      <td className="cm">{p.product_id}</td>
                      <td className="cb">{p.product_name}</td>
                      <td className="cm">₺{p.price}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: col, fontWeight: 600 }}>
                          {p.stock_count}
                        </span>
                      </td>
                      <td className="cm">{p.critical_threshold}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                          <div className="sb" style={{ flex: 1 }}>
                            <div className="sbf" style={{ width: `${Math.min(pct, 100)}%`, background: col }} />
                          </div>
                          <span className="sbp">%{pct}</span>
                        </div>
                      </td>
                      <td><Badge label={p.available ? 'Var' : 'Yok'} color={p.available ? 'green' : 'red'} /></td>
                      <td className="cm" style={{ fontSize: 10 }}>{p.supplier_email}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={isCrit ? { background: 'rgba(249,115,22,.12)', color: 'var(--orange)', border: '1px solid rgba(249,115,22,.25)' } : {}}
                          onClick={() => handleMailFor(p)}
                        >
                          {isCrit ? '⚡ Mail' : '✉️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
