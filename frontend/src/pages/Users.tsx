import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/usersApi';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Input } from '../components/common/Input';
import { Loader } from '../components/common/Loader';
import { Select } from '../components/common/Select';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { usePagination } from '../hooks/usePagination';
import type { ListResponse, User, UserRole } from '../types/api';
import { formatDate, formatLabel } from '../utils/formatters';

const roleOptions = [
  { label: 'مدير النظام', value: 'admin' },
  { label: 'محقق', value: 'investigator' },
  { label: 'مشاهد', value: 'viewer' },
  { label: 'مدقق', value: 'auditor' }
];

const statusOptions = [
  { label: 'نشط', value: 'active' },
  { label: 'غير نشط', value: 'inactive' }
];

export function Users() {
  const { user: currentUser } = useAuth();
  const [response, setResponse] = useState<ListResponse<User>>({ data: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const pagination = usePagination(response.meta);

  const filters = useMemo(() => ({ page: pagination.page, limit: pagination.limit, search: debouncedSearch, role, status }), [pagination.page, pagination.limit, debouncedSearch, role, status]);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResponse(await usersApi.getUsers(filters)); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل تحميل المستخدمين.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => { pagination.resetPage(); }, [debouncedSearch, role, status]);

  async function changeRole(item: User, value: string) {
    setBusy(item._id); setError(null);
    try { await usersApi.updateRole(item._id, value as UserRole); await loadUsers(); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل تحديث الدور.'); }
    finally { setBusy(null); }
  }

  async function toggleStatus(item: User) {
    setBusy(item._id); setError(null);
    try { await usersApi.updateStatus(item._id, !item.isActive); await loadUsers(); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل تحديث الحالة.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="page-stack">
      <PageHeader title="إدارة المستخدمين" description="إدارة أدوار وحالة الحسابات للمدير فقط." />
      <Card><CardBody><div className="filters-grid">
        <Input label="البحث" placeholder="الاسم أو البريد..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label="الدور" placeholder="كل الأدوار" options={roleOptions} value={role} onChange={(event) => setRole(event.target.value)} />
        <Select label="الحالة" placeholder="كل الحالات" options={statusOptions} value={status} onChange={(event) => setStatus(event.target.value)} />
      </div></CardBody></Card>
      {error ? <ErrorState message={error} onRetry={loadUsers} /> : null}
      <Card><CardHeader><h2>حسابات المستخدمين</h2></CardHeader><CardBody>
        {loading ? <Loader label="جاري تحميل المستخدمين..." /> : response.data.length ? (
          <>
            <div className="table-wrap"><table><thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>الإجراءات</th></tr></thead><tbody>
              {response.data.map((item) => {
                const isSelf = currentUser?._id === item._id;
                const isBusy = busy === item._id;
                return <tr key={item._id}>
                  <td><strong>{item.fullName || item.name || 'Unnamed User'}</strong><small className="table-subtext">{item.email}</small></td>
                  <td><Badge>{formatLabel(item.role)}</Badge></td>
                  <td><Badge>{item.isActive ? 'نشط' : 'غير نشط'}</Badge></td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td><div className="action-row">
                    <Select aria-label="الدور" options={roleOptions} value={item.role || 'viewer'} onChange={(event) => changeRole(item, event.target.value)} disabled={isSelf || isBusy} />
                    <Button variant={item.isActive ? 'danger' : 'secondary'} size="sm" disabled={isSelf || isBusy} onClick={() => toggleStatus(item)}>
                      {item.isActive ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </div>{isSelf ? <small className="table-subtext">Self changes are blocked.</small> : null}</td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="pagination"><span>صفحة {pagination.page} of {pagination.totalPages} · {pagination.totalItems} سجل</span><div><Button variant="secondary" size="sm" disabled={!pagination.canGoPrevious} onClick={pagination.goPrevious}>السابق</Button><Button variant="secondary" size="sm" disabled={!pagination.canGoNext} onClick={pagination.goNext}>التالي</Button></div></div>
          </>
        ) : <EmptyState title="لا يوجد مستخدمون" description="لا يوجد حساب يطابق عوامل التصفية الحالية." />}
      </CardBody></Card>
    </div>
  );
}
