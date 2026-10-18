import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";
import { casesApi, type CasePayload } from "../api/casesApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Input } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { Modal } from "../components/common/Modal";
import { Select } from "../components/common/Select";
import { Textarea } from "../components/common/Textarea";
import { PageHeader } from "../components/layout/PageHeader";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import type { Case, ListResponse } from "../types/api";
import { CASE_STATUSES, PRIORITIES } from "../utils/constants";
import { formatDate, formatLabel } from "../utils/formatters";
import { parseTags, stringifyTags } from "../utils/fileHelpers";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";

const emptyForm: CasePayload = {
  title: "",
  description: "",
  status: "open",
  tags: []
};

interface CasesProps {
  openCreateByDefault?: boolean;
}

export function Cases({ openCreateByDefault = false }: CasesProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const createModalOpenedFromRoute = useRef(false);
  const canCreateCase = can(user, "createCase");
  const canEditCase = can(user, "editCase");
  const canArchiveCase = can(user, "archiveCase");
  const [response, setResponse] = useState<ListResponse<Case>>({ data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const debouncedSearch = useDebounce(search);
  const pagination = usePagination(response.meta);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [form, setForm] = useState<CasePayload>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filters = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch,
      status,
      priority
    }),
    [pagination.page, pagination.limit, debouncedSearch, status, priority]
  );

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await casesApi.getCases(filters);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل القضايا.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    pagination.resetPage();
  }, [debouncedSearch, status, priority]);

  useEffect(() => {
    const createRequested = searchParams.get("create") === "1" || searchParams.get("new") === "1";

    if (!canCreateCase || createModalOpenedFromRoute.current || (!openCreateByDefault && !createRequested)) {
      return;
    }

    createModalOpenedFromRoute.current = true;
    openCreateModal();

    if (createRequested) {
      setSearchParams({}, { replace: true });
    }
  }, [canCreateCase, openCreateByDefault, searchParams, setSearchParams]);

  function openCreateModal() {
    setEditingCase(null);
    setForm(emptyForm);
    setTagsInput("");
    setModalOpen(true);
  }

  function openEditModal(item: Case) {
    setEditingCase(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      status: item.status || "open",
      tags: item.tags || []
    });
    setTagsInput(stringifyTags(item.tags));
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("عنوان البلاغ مطلوب.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CasePayload = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim(),
      tags: parseTags(tagsInput)
    };

    try {
      if (editingCase) {
        await casesApi.updateCase(editingCase._id, payload);
      } else {
        await casesApi.createCase(payload);
      }

      setModalOpen(false);
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ البلاغ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await casesApi.deleteCase(deleteTarget._id);
      setDeleteTarget(null);
      await loadCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل أرشفة القضية.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title=" البلاغات"
        description={canCreateCase ? "إنشاء البلاغات وفرزها ومراجعتها." : "استعراض البلاغات  وفرزها ومراجعتها من لوحة الإدارة بدون إنشاء بلاغات جديدة."}
        actions={
          canCreateCase ? (
            <Button onClick={openCreateModal}>
              <Plus size={16} />
              بلاغ جديد
            </Button>
          ) : null
        }
      />

      <Card>
        <CardBody>
          <div className="filters-grid">
            <Input
              label="البحث"
              placeholder="ابحث في البلاغات"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Select
              label="الحالة"
              placeholder="كل الحالات"
              options={CASE_STATUSES}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />

            <Select
              label="الأولوية"
              placeholder="كل الأولويات"
              options={PRIORITIES}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {error ? <ErrorState message={error} onRetry={loadCases} /> : null}

      <Card>
        <CardHeader>
          <h2>سجلات البلاغات</h2>
        </CardHeader>

        <CardBody>
          {loading ? (
            <Loader label="جاري تحميل البلاغات..." />
          ) : response.data.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>العنوان</th>
                      <th>الحالة</th>
                      <th>الأولوية</th>
                      <th>الوسوم</th>
                      <th>تاريخ الإنشاء</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {response.data.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <Link to={`/cases/${item._id}`} className="table-link">
                            {item.title}
                          </Link>
                          {item.description ? (
                            <small className="table-subtext">
                              {item.description}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          <Badge>{formatLabel(item.status)}</Badge>
                        </td>
                        <td>
                          <Badge>{formatLabel(item.priority)}</Badge>
                        </td>
                        <td>
                          <div className="tag-row">
                            {(item.tags || []).slice(0, 3).map((tag) => (
                              <span className="tag" key={tag}>
                                {tag}
                              </span>
                            ))}
                            {(item.tags?.length || 0) > 3 ? (
                              <span className="tag muted">
                                +{(item.tags?.length || 0) - 3}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            <Link to={`/cases/${item._id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye size={15} />
                              </Button>
                            </Link>
                            {canEditCase ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit size={15} />
                              </Button>
                            ) : null}
                            {canArchiveCase ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 size={15} />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ·{" "}
                  {pagination.totalItems} records
                </span>
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.canGoPrevious}
                    onClick={pagination.goPrevious}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.canGoNext}
                    onClick={pagination.goNext}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="لا توجد بلاغات"
              description="أنشئ بلاغ أو عدّل عوامل التصفية الحالية."
              action={canCreateCase ? <Button onClick={openCreateModal}>إنشاء بلاغ</Button> : undefined}
            />
          )}
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        title={editingCase ? "تعديل البلاغ" : "إنشاء بلاغ جديدة"}
        description="املأ بيانات البلاغ التحقيقية."
        onClose={() => setModalOpen(false)}
      >
        <form className="form-stack" onSubmit={handleSubmit}>
          <Input
            label="العنوان"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            required
          />

          <Textarea
            label="الوصف"
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value
              }))
            }
          />

          <div className="grid-2">
            <Select
              label="الحالة"
              options={CASE_STATUSES}
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value
                }))
              }
            />
          </div>

          <Input
            label="الوسوم"
            placeholder="fraud, mobile, urgent"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />

          <div className="modal-footer clean">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ البلاغ"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف البلاغ"
        message={`حذف "${deleteTarget?.title}"? This action should only be used when the case is no longer active.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
