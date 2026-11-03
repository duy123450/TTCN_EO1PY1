import {
  ArrowRightIcon,
  Building2Icon,
  CalendarCheckIcon,
  CalendarClockIcon,
  DollarSignIcon,
  FileTextIcon,
  PlaneIcon,
  UsersIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

const HRDashboard = ({ data }) => {
  const stats = [
    {
      icon: UsersIcon,
      label: "Total Employees",
      value: data.totalEmployees ?? 0,
      description: "Across the organization",
      accent: "text-indigo-600 bg-indigo-50",
    },
    {
      icon: Building2Icon,
      label: "Departments",
      value: data.totalDepartments ?? 0,
      description: "Organization units",
      accent: "text-sky-600 bg-sky-50",
    },
    {
      icon: CalendarCheckIcon,
      label: "Present Today",
      value: data.todayAttendance ?? 0,
      description: "Employees checked in",
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: FileTextIcon,
      label: "Pending Requests",
      value: data.totalPendingRequests ?? 0,
      description: "Awaiting review",
      accent: "text-amber-600 bg-amber-50",
    },
  ];

  const requestTypes = [
    { icon: FileTextIcon, label: "Leave requests", value: data.pendingLeaves ?? 0 },
    { icon: CalendarClockIcon, label: "Overtime requests", value: data.pendingOvertime ?? 0 },
    { icon: PlaneIcon, label: "Business trips", value: data.pendingBusinessTrips ?? 0 },
  ];

  const employees = data.recentEmployees ?? [];

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">HR Dashboard</h1>
          <p className="page-subtitle">
            Your overview of people, attendance, and requests.
          </p>
        </div>
        <Link
          to="/employees"
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          Manage employees <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card card-hover flex items-center justify-between gap-4 p-5"
          >
            <div>
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stat.description}</p>
            </div>
            <stat.icon className={`size-11 shrink-0 rounded-xl p-3 ${stat.accent}`} />
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card p-5 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Recent employees</h2>
              <p className="mt-1 text-sm text-slate-500">
                Recently added to the organization
              </p>
            </div>
            <Link
              to="/employees"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          {employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table-modern min-w-[560px]">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                            {employee.firstName?.[0]}
                            {employee.lastName?.[0]}
                          </span>
                          <span className="font-medium text-slate-800">
                            {employee.firstName} {employee.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-600">{employee.position}</td>
                      <td className="text-slate-600">{employee.department}</td>
                      <td>
                        <span className="badge badge-success">
                          {employee.employmentStatus ?? "ACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No recent employees to show.
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">Requests to review</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pending items across the organization
            </p>
          </div>
          <div className="space-y-3">
            {requestTypes.map((request) => (
              <div
                key={request.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <request.icon className="size-9 rounded-lg bg-slate-50 p-2 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {request.label}
                  </span>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
                  {request.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">Monthly payroll</p>
            <p className="mt-1 flex items-center gap-1 text-xl font-semibold text-slate-900">
              <DollarSignIcon className="size-5 text-emerald-600" />
              {(data.monthlyPayroll ?? 0).toLocaleString()}
            </p>
          </div>
        </section>
      </div>

      <Link
        to="/attendance"
        className="btn-secondary inline-flex items-center justify-center gap-2"
      >
        View attendance <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
};

export default HRDashboard;
