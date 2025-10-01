// apps/protected/app/page.tsx
import { SessionEvaluator } from "../components/shared/session-evaluator";
export default function ProtectedHomePage() {
  return <SessionEvaluator />;
}
