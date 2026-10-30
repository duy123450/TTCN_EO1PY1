import { Link } from "react-router-dom";
import LoginLeftSide from "../components/LoginLeftSide";
import { ArrowRightIcon, ShieldIcon, UserIcon } from "lucide-react";

const LoginLanding = () => {
  const portalOptions = [
    {
      to: "/login/admin",
      title: "Admin Portal",
      description:
        "Manage employees, departments, payroll, and system configurations.",
      icon: ShieldIcon,
    },
    {
      to: "/login/employee",
      title: "Employee Portal",
      description:
        "View your profile, track attendance, request time off, and access payslips.",
      icon: UserIcon,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LoginLeftSide />

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative overflow-y-auto min-h-screen">
        <div className="w-full max-w-md animate-fade-in relative z-10">
          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-medium text-slate-900 tracking-tight mb-3">
              Welcome Back
            </h2>
            <p className="text-slate-500">
              Select your portal to securely access the system.
            </p>
          </div>

          {/* Portal List */}
          <div className="space-y-4">
            {portalOptions.map((portal) => {
              return (
                <Link
                  key={portal.to}
                  to={portal.to}
                  className="group block rounded-lg border border-slate-200 bg-slate-50 p-5 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50 sm:p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-lg text-slate-800 transition-colors group-hover:text-indigo-600">
                        {portal.title}
                      </h3>
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
          <div className="mt-12 text-center md:text-left text-sm text-slate-400">
            <p>© {new Date().getFullYear()} nerfIori. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginLanding;
