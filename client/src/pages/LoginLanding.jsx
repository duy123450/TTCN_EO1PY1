import { Link } from "react-router-dom";
import LoginLeftSide from "../components/LoginLeftSide";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

const LoginLanding = () => {
  const portalOptions = [
    {
      to: "/login/admin",
      title: "Admin Portal",
      description:
        "Manage your organization, users, and system settings.",
      icon: ShieldIcon,
    },
    {
      to: "/login/employee",
      title: "Employee Portal",
      description:
        "View your profile, track attendance, request time off, and access payslips.",
      icon: UserIcon,
    },
    {
      to: "/login/hr",
      title: "HR Portal",
      description:
        "Manage employee records, benefits, and HR-related tasks.",
      icon: UsersIcon,
    },
    {
      to: "/login/manager",
      title: "Manager Portal",
      description:
        "View team performance, manage projects, and access reporting tools.",
      icon: BriefcaseBusinessIcon,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LoginLeftSide />

      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 md:w-1/2 lg:px-14 lg:py-10">
        <div className="w-full max-w-md animate-fade-in relative z-10">
          {/* Header */}
          <div className="mb-1.5 text-center md:text-left">
            <h2 className="mb-0.2 text-3xl font-medium tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="text-slate-500">
              Select your portal to securely access the system.
            </p>
          </div>

          {/* Portal List */}
          <div className="space-y-3">
            {portalOptions.map((portal) => {
              const Icon = portal.icon;

              return (
                <Link
                  key={portal.to}
                  to={portal.to}
                  className="group block rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50 sm:p-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-0.5 text-base text-slate-800 transition-colors group-hover:text-indigo-600">
                        {portal.title}
                      </h3>
                      <p className="text-sm leading-snug text-slate-500">
                        {portal.description}
                      </p>
                    </div>
                    <ArrowRightIcon
                      className="h-4 w-4 shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-indigo-600"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-sm text-slate-400 md:text-left">
            <p>© {new Date().getFullYear()} nerfIori. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginLanding;
