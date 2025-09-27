// apps/protected/app/page.tsx 
import { SessionEvaluator } from "../components/session-evaluator";

export default function ProtectedHomePage() {
  return <SessionEvaluator />;
}
