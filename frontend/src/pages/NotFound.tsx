import { Link } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card, CardBody } from "../components/common/Card";

export function NotFound() {
  return (
    <div className="not-found-page">
      <Card>
        <CardBody className="not-found-card">
          <span className="not-found-code">404</span>
          <h1>الصفحة غير موجودة</h1>
          <p>The requested EvidenceSystem page does not exist.</p>

          <Link to="/">
            <Button>العودة إلى لوحة التحكم</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}