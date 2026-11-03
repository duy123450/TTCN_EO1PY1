import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  CheckCircle2Icon,
  Clock3Icon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

const ManagerDashboard = ({ data }) => {
  const stats = [
    {
      icon: UsersIcon,
      label: "Team members",
      value: data.totalTeamMembers ?? 0,
      accent: "text-indigo-600 bg-indigo-50",
    },
    {
      icon: CalendarCheckIcon,
      label: "Present today",
      value: data.presentToday ?? 0,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: CalendarXIcon,
      label: "Absent today",
      value: data.absentToday ?? 0,
      accent: "text-rose-600 bg-rose-50",
    },
    {
      icon: CheckCircle2Icon,
      label: "Attendance rate",
      value: `${data.attendanceRate ?? 0}%`,
      accent: "text-sky-600 bg-sky-50",
    },
  ]

  const teamMembers = data.teamMembers ?? []
  const recentRequests = data.recentRequests ?? []

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Manager Dashboard</h1>
          <p className="page-subtitle">
            {data.department
              ? `Your ${data.department} team at a glance.`
              : "Your team at a glance."}
          </p>
        </div>
        <Link
          to="/attendance"
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          View attendance <ArrowRightIcon className="size-4" />
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
                {stat.value}
              </p>
            </div>
            <stat.icon
              className={`size-11 shrink-0 rounded-xl p-3 ${stat.accent}`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Your team</h2>
              <p className="mt-1 text-sm text-slate-500">
                {teamMembers.length}{" "}
                {teamMembers.length === 1 ? "member" : "members"}
                {data.department ? ` · ${data.department}` : ""}
              </p>
            </div>
            <UsersIcon className="size-9 rounded-lg bg-indigo-50 p-2 text-indigo-600" />
          </div>

          {teamMembers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {teamMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {member.firstName?.[0]}
                      {member.lastName?.[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {member.position}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-success shrink-0">
                    {member.employmentStatus ?? "ACTIVE"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No team members to show.
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Recent requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                {data.pendingApprovals ?? 0} pending approvals
              </p>
            </div>
            <Clock3Icon className="size-9 rounded-lg bg-amber-50 p-2 text-amber-600" />
          </div>

          {recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <article
                  key={request._id}
                  className="rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {request.employeeName}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-indigo-600">
                        {request.type}
                      </p>
                    </div>
                    <span className="badge badge-warning">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {request.reason}
                  </p>
                  {request.submittedAt && (
                    <time
                      className="mt-2 block text-xs text-slate-400"
                      dateTime={request.submittedAt}
                    >
                      Submitted{" "}
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </time>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No recent requests to show.
            </p>
          )}
          <Link
            to="/leave"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Review leave requests <ArrowRightIcon className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard
