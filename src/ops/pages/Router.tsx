/* Renders the operational page for the current module and top-bar tab. Home
   and the Records Ontology, Files and Contacts tabs keep their original views. */
import Enquiries from "./Enquiries";
import Jobs from "./Jobs";
import Schedule from "./Schedule";
import Production from "./Production";
import Finance from "./Finance";
import Dashboard from "./Dashboard";
import Work from "./Work";
import Activity from "./Activity";
import Settings from "./Settings";
import Agents from "./Agents";
import RecordsTabs from "./RecordsTabs";

export default function OpsRouter({ v }: { v: { page: string; modTabCur: string | null } }) {
  const tab = v.modTabCur || "";
  switch (v.page) {
    case "Enquiries": return <Enquiries tab={tab} />;
    case "Jobs": return <Jobs tab={tab} />;
    case "Schedule": return <Schedule tab={tab} />;
    case "Production": return <Production tab={tab} />;
    case "Finance": return <Finance tab={tab} />;
    case "Dashboard": return <Dashboard tab={tab} />;
    case "Work": return <Work tab={tab} />;
    case "Activity": return <Activity tab={tab} />;
    case "Settings": return <Settings tab={tab} />;
    case "Agents": return <Agents tab={tab} />;
    case "Records": return ["ontology", "files", "contacts"].includes(tab) ? null : <RecordsTabs tab={tab} />;
  }
  return null;
}
