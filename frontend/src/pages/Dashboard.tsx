import { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Archive,
  BrainCircuit,
  Database,
  Fingerprint,
  FileText,
  FolderOpen,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Workflow
} from "lucide-react";
import { dashboardApi } from "../api/dashboardApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Loader } from "../components/common/Loader";
import { PageHeader } from "../components/layout/PageHeader";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import { useApi } from "../hooks/useApi";
import { formatDate, formatLabel, getCaseLabel, getEvidenceLabel } from "../utils/formatters";

type MetricInput = Record<string, number> | Array<Record<string, string | number | null | undefined>> | null | undefined;
interface NormalizedMetric { label: string; value: number; }

function normalizeMetrics(data: MetricInput, labelKeys: string[]): NormalizedMetric[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item) => {
      const labelKey = labelKeys.find((key) => item[key] !== undefined);
      return { label: String(labelKey ? item[labelKey] : "unknown"), value: Number(item.count ?? item.total ?? item.value ?? 0) };
    }).filter((item) => item.label !== "unknown" || item.value > 0);
  }
  return Object.entries(data).map(([key, value]) => ({ label: key, value: Number(value || 0) }));
}

function IntelStat({ label, value, icon: Icon, tone = "cyan" }: { label: string; value?: number; icon: typeof Database; tone?: "cyan" | "red" | "gold" | "green"; }) {
  return (
    <div className={`intel-stat tone-${tone}`}>
      <div className="intel-stat-icon"><Icon size={22} /></div>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      <small>live intelligence</small>
    </div>
  );
}

function MetricBars({ title, data, labelKeys }: { title: string; data: MetricInput; labelKeys: string[]; }) {
  const entries = normalizeMetrics(data, labelKeys);
  const max = Math.max(...entries.map((item) => item.value), 1);
  return (
    <Card className="intel-card">
      <CardHeader><h2>{title}</h2><Badge tone="info">classified metrics</Badge></CardHeader>
      <CardBody>
        {entries.length ? <div className="intel-bars">
          {entries.map((item) => (
            <div className="intel-bar-row" key={item.label}>
              <div><span>{formatLabel(item.label)}</span><strong>{item.value}</strong></div>
              <div className="intel-bar"><i style={{ width: `${Math.max(12, (item.value / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div> : <EmptyState title="لا توجد إحصائيات" description="لا توجد بيانات مجمعة حالياً." />}
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const requestDashboard = useCallback(() => dashboardApi.getDashboard(), []);
  const { data, loading, error, execute } = useApi(requestDashboard);

  if (loading) return <Loader label="جاري فتح غرفة التحقيق الرقمية..." />;
  if (error) return <ErrorState message={error} onRetry={execute} />;
  if (!data) return <EmptyState title="غرفة التحقيق غير متاحة" description="لم يرجع الخادم بيانات للوحة التحكم." />;

  const threatScore = Math.min(99, Math.round(((data.openCases || 0) * 8 + (data.activeEvidence || 0) * 3) / Math.max(1, (data.totalCases || 1))));
  const canViewTimeline = can(user, "viewTimeline");
  const canGenerateReport = can(user, "generateReport");

  return (
    <div className="page-stack investigation-dashboard">
      <PageHeader
        title={`Investigation Room · ${user?.fullName || user?.email || "Digital Investigator"}`}
        description="واجهة سرية لإدارة البلاغات، الأدلة الرقمية، سلسلة الحيازة، التقارير، والتحليل الجنائي السيبراني."
        actions={
          <>
            {can(user, "uploadEvidence") && <Link to="/upload"><Button>استلام دليل جديد</Button></Link>}
            {can(user, "createCase") && <Link to="/cases/new"><Button variant="secondary">فتح ملف بلاغ</Button></Link>}
            {canGenerateReport && <Link to="/reports"><Button variant="secondary">تقرير رسمي</Button></Link>}
          </>
        }
      />

      <section className="command-hero">
        <div className="threat-orb-card">
          <div className="threat-orb">
            <span>{threatScore}</span>
            <small>THREAT SCORE</small>
          </div>
          <div>
            <Badge tone={threatScore > 60 ? "danger" : "warning"}>Active Investigation Layer</Badge>
            <h2>Cyber Investigation Command Core</h2>
            <p>النظام يراقب البلاغات المفتوحة، الأدلة النشطة، أحداث السجل، ونقاط الخطورة داخل غرفة تحقيق واحدة.</p>
          </div>
        </div>

        <div className="case-map-card">
          <div className="case-map-node primary"><Radar size={20} /> Core</div>
          <div className="case-map-node n1">Cases</div>
          <div className="case-map-node n2">Evidence</div>
          <div className="case-map-node n3">{canGenerateReport ? "Reports" : "Timeline"}</div>
          <div className="case-map-node n4">AURA</div>
          <span className="case-line l1" /><span className="case-line l2" /><span className="case-line l3" /><span className="case-line l4" />
        </div>
      </section>

      <div className="intel-stats-grid">
        <IntelStat label="إجمالي البلاغات" value={data.totalCases} icon={FolderOpen} tone="cyan" />
        <IntelStat label="بلاغات مفتوحة" value={data.openCases} icon={Siren} tone="red" />
        <IntelStat label="إجمالي الأدلة" value={data.totalEvidence} icon={Database} tone="gold" />
        <IntelStat label="أدلة نشطة" value={data.activeEvidence} icon={Fingerprint} tone="green" />
        <IntelStat label="أدلة مؤرشفة" value={data.archivedEvidence} icon={Archive} tone="cyan" />
      </div>

      <div className="grid-2">
        <MetricBars title="Evidence Classification" data={data.evidenceByType as MetricInput} labelKeys={["type", "evidenceType", "_id"]} />
        <MetricBars title="Priority Intelligence" data={data.evidenceByPriority as MetricInput} labelKeys={["priority", "_id"]} />
      </div>

      <div className="grid-2 investigation-split">
        <Card className="intel-card">
          <CardHeader><h2><FileText size={18} /> Evidence Stream</h2><Badge tone="success">hash watch</Badge></CardHeader>
          <CardBody>
            {data.recentEvidence?.length ? <div className="evidence-stream">
              {data.recentEvidence.map((item) => (
                <Link className="evidence-intel-row" to={`/evidence/${item._id}`} key={item._id}>
                  <div className="evidence-dot"><Fingerprint size={16} /></div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{getCaseLabel(item.caseId)} · {formatLabel(item.evidenceType || item.type)}</span>
                  </div>
                  <Badge>{formatLabel(item.priority)}</Badge>
                </Link>
              ))}
            </div> : <EmptyState title="لا توجد أدلة حديثة" description="ستظهر الأدلة هنا بعد إنشائها أو رفعها." />}
          </CardBody>
        </Card>

        {canViewTimeline ? (
          <Card className="intel-card">
            <CardHeader><h2><Workflow size={18} /> Investigation Timeline</h2><Badge tone="info">audit trail</Badge></CardHeader>
            <CardBody>
              {data.recentTimeline?.length ? <div className="classified-timeline">
                {data.recentTimeline.map((item) => (
                  <article className="classified-timeline-item" key={item._id}>
                    <div><Activity size={15} /></div>
                    <section>
                      <Badge>{formatLabel(item.action)}</Badge>
                      <h3>{item.message || getEvidenceLabel(item.evidenceId)}</h3>
                      <p>{getCaseLabel(item.caseId)} · {getEvidenceLabel(item.evidenceId)}</p>
                      <time>{formatDate(item.createdAt)}</time>
                    </section>
                  </article>
                ))}
              </div> : <EmptyState title="لا يوجد نشاط مسجل" description="ستظهر أحداث السجل بعد تنفيذ عمليات على البلاغات أو الأدلة." />}
            </CardBody>
          </Card>
        ) : null}
      </div>

    
    </div>
  );
}
