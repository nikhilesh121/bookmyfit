import Shell from '../../../components/Shell';

const EMPLOYEES = [
  { name: 'Arjun Nair', company: 'TechCorp Inc.', dept: 'Engineering', checkins: 22, lastVisit: '28 May 2025', status: 'Active' },
  { name: 'Meera Patel', company: 'TechCorp Inc.', dept: 'Sales', checkins: 18, lastVisit: '27 May 2025', status: 'Active' },
  { name: 'Raj Kumar', company: 'FinServ Global', dept: 'Operations', checkins: 14, lastVisit: '26 May 2025', status: 'Active' },
  { name: 'Divya Sharma', company: 'FinServ Global', dept: 'HR', checkins: 8, lastVisit: '20 May 2025', status: 'Inactive' },
  { name: 'Sanjay Gupta', company: 'MediaHouse Pvt.', dept: 'Creative', checkins: 26, lastVisit: '28 May 2025', status: 'Active' },
  { name: 'Neha Reddy', company: 'StartupXYZ', dept: 'Product', checkins: 4, lastVisit: '15 May 2025', status: 'Active' },
];

export default function CorporateEmployeesPage() {
  return (
    <Shell title="Corporate Employees">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Employees', value: '2,164' },
          { label: 'Active This Month', value: '1,640' },
          { label: 'Avg Check-ins/User', value: '14.2' },
        ].map((s) => (
          <div key={s.label} className="card stat-glow p-5">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-5">
        <input className="glass-input flex-1" placeholder="Search employees..." />
        <select className="glass-input"><option>All Companies</option><option>TechCorp Inc.</option><option>FinServ Global</option><option>MediaHouse Pvt.</option></select>
        <button className="btn btn-ghost">Export</button>
      </div>
      <div className="glass overflow-hidden">
        <table className="glass-table">
          <thead><tr><th>Name</th><th>Company</th><th>Department</th><th>Check-ins</th><th>Last Visit</th><th>Status</th></tr></thead>
          <tbody>
            {EMPLOYEES.map((e) => (
              <tr key={e.name}>
                <td className="font-semibold text-white">{e.name}</td>
                <td>{e.company}</td>
                <td>{e.dept}</td>
                <td>{e.checkins}</td>
                <td>{e.lastVisit}</td>
                <td><span className={e.status === 'Active' ? 'badge-active' : 'badge-pending'}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
