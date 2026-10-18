import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { analysisApi } from '../api/analysisApi';
import { evidenceApi } from '../api/evidenceApi';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import { PageHeader } from '../components/layout/PageHeader';
import type { AnalysisResult, Evidence } from '../types/api';
import { formatDate } from '../utils/formatters';

type Tab = 'text' | 'link' | 'evidence';

function ResultCard({ result }: { result: AnalysisResult | null }) {
  if (!result) return null;
  return (
    <Card>
      <CardHeader><h2>نتيجة التحليل</h2></CardHeader>
      <CardBody>
        <div className="details-grid">
          <span>درجة الخطورة</span><strong>{result.riskScore}/100</strong>
          <span>مستوى الخطورة</span><strong><Badge>{result.riskLevel}</Badge></strong>
          <span>الملخص</span><strong>{result.summary}</strong>
          <span>التوصية</span><strong>{result.recommendation}</strong>
        </div>
        <div className="risk-meter"><span style={{ width: `${result.riskScore}%` }} /></div>
        <h3>المؤشرات</h3>
        {result.indicators.length ? (
          <ul className="indicator-list">
            {result.indicators.map((item, index) => <li key={`${item.key}-${index}`}><Badge>{item.severity}</Badge> {item.message}</li>)}
          </ul>
        ) : <p>لا توجد مؤشرات.</p>}
      </CardBody>
    </Card>
  );
}

export function Analysis() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('evidenceId') ? 'evidence' : 'text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceId, setEvidenceId] = useState(searchParams.get('evidenceId') || '');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evidenceOptions = useMemo(() => evidence.map((item) => ({ value: item._id, label: item.title })), [evidence]);

  useEffect(() => {
    evidenceApi.getEvidence({ limit: 100 }).then((value) => setEvidence(value.data)).catch(() => setEvidence([]));
  }, []);

  useEffect(() => {
    if (!evidenceId) { setHistory([]); return; }
    analysisApi.getEvidenceHistory(evidenceId).then(setHistory).catch(() => setHistory([]));
  }, [evidenceId]);

  async function run(action: () => Promise<AnalysisResult>) {
    setLoading(true); setError(null); setResult(null);
    try { const output = await action(); setResult(output); if (evidenceId) setHistory(await analysisApi.getEvidenceHistory(evidenceId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل التحليل.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-stack">
      <PageHeader title="التحليل المبدئي" description="تحليل مبدئي للنصوص والروابط وبيانات الأدلة المحفوظة." />
      {error ? <div className="alert error">{error}</div> : null}
      <div className="tab-row">
        <Button variant={tab === 'text' ? 'primary' : 'secondary'} onClick={() => setTab('text')}>تحليل نص</Button>
        <Button variant={tab === 'link' ? 'primary' : 'secondary'} onClick={() => setTab('link')}>تحليل رابط</Button>
        <Button variant={tab === 'evidence' ? 'primary' : 'secondary'} onClick={() => setTab('evidence')}>تحليل دليل محفوظ</Button>
      </div>

      {tab === 'text' ? (
        <Card><CardHeader><h2>تحليل نص</h2></CardHeader><CardBody>
          <Textarea label="النص" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
          <Button disabled={loading || !text.trim()} onClick={() => run(() => analysisApi.analyzeText(text))}><ShieldAlert size={16} /> تحليل Text</Button>
        </CardBody></Card>
      ) : null}

      {tab === 'link' ? (
        <Card><CardHeader><h2>تحليل رابط</h2></CardHeader><CardBody>
          <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          <Button disabled={loading || !url.trim()} onClick={() => run(() => analysisApi.analyzeLink(url))}><ShieldAlert size={16} /> تحليل Link</Button>
        </CardBody></Card>
      ) : null}

      {tab === 'evidence' ? (
        <Card><CardHeader><h2>تحليل دليل محفوظ</h2></CardHeader><CardBody>
          <Select label="الدليل" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} options={evidenceOptions} placeholder="اختر دليلاً" />
          <Button disabled={loading || !evidenceId} onClick={() => run(() => analysisApi.analyzeEvidence(evidenceId))}><ShieldAlert size={16} /> تحليل Evidence</Button>
        </CardBody></Card>
      ) : null}

      <ResultCard result={result} />

      {tab === 'evidence' && evidenceId ? (
        <Card><CardHeader><h2>السجل السابق</h2></CardHeader><CardBody>
          {history.length ? <ul className="indicator-list">{history.map((item) => <li key={item._id}>{formatDate(item.createdAt)} — <Badge>{item.riskLevel}</Badge> {item.summary}</li>)}</ul> : <p>No analysis history.</p>}
        </CardBody></Card>
      ) : null}
    </div>
  );
}
