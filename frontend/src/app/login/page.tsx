"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation, ValidationConfigs } from "@/hooks/useValidation";
import LoadingScreen from "@/components/LoadingScreen";
import { User, Lock, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  usePageTitle("Dashboard - Inloggen");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation setup
  const { fieldErrors, setFieldErrors, validateForm } = useValidation({
    ...ValidationConfigs.login,
    validateOnChange: false,
  });

  const { login, user, isLoading } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/home");
    }
  }, [user, isLoading, router]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submitting
    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(formData.username, formData.password);

      if (result.success) {
        router.push("/home");
      } else {
        // Show error using the new error system
        showApiError(result.error || "Inloggen mislukt");
      }
    } catch (error: unknown) {
      // This catches any unexpected errors
      showApiError(
        error,
        "Er is een onverwachte fout opgetreden tijdens het inloggen"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Inlogstatus controleren" />;
  }

  return (
    <div
      className="min-h-screen flex max-[500px]:items-start max-[500px]:pt-20 items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)",
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ background: "linear-gradient(135deg, #3b82f6, #e0e7ff)" }}
        ></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: "linear-gradient(45deg, #6366f1, #64748b)" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full blur-2xl opacity-10"
          style={{ background: "linear-gradient(135deg, #3b82f6, #e0e7ff)" }}
        ></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo/Header Card */}
        <div className="text-center">
          <div
            className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.25)",
            }}
          >
            <User className="h-10 w-10 text-white" />
          </div>
          <h2
            className="text-3xl font-bold"
            style={{
              background: "linear-gradient(135deg, #1e293b, #475569)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Werknemers Dashboard
          </h2>
          <p className="mt-3 font-medium" style={{ color: "#64748b" }}>
            Log in om je dashboard te bekijken
          </p>
        </div>

        {/* Login Form Card */}
        <div
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 space-y-6"
          style={{ boxShadow: "0 25px 50px rgba(103, 105, 124, 0.15)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Username Field */}
              <div className="group">
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#120309" }}
                >
                  Gebruikersnaam
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ width: "48px" }}
                  >
                    <User
                      className="h-5 w-5 transition-colors duration-200"
                      style={{ color: "#67697c" }}
                    />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className={`appearance-none relative block w-full pl-12 pr-4 py-3 border text-gray-900 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-gray-50/50 hover:bg-white/80 focus:shadow-lg ${
                      fieldErrors.username
                        ? "border-red-300"
                        : "border-gray-200"
                    }`}
                    style={{
                      color: "#120309",
                    }}
                    placeholder="Voer je gebruikersnaam in"
                    disabled={isSubmitting}
                    onFocus={(e) => {
                      if (!fieldErrors.username) {
                        const target = e.target as HTMLInputElement;
                        target.style.boxShadow =
                          "0 0 0 2px rgba(59, 130, 246, 0.5), 0 10px 25px rgba(59, 130, 246, 0.15)";
                        target.style.borderColor = "#3b82f6";
                      }
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = "";
                      target.style.borderColor = fieldErrors.username
                        ? "#fca5a5"
                        : "#d1d5db";
                    }}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#120309" }}
                >
                  Wachtwoord
                </label>
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ width: "48px" }}
                  >
                    <Lock
                      className="h-5 w-5 transition-colors duration-200"
                      style={{ color: "#67697c" }}
                    />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`appearance-none relative block w-full pl-12 pr-12 py-3 border text-gray-900 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-gray-50/50 hover:bg-white/80 focus:shadow-lg ${
                      fieldErrors.password
                        ? "border-red-300"
                        : "border-gray-200"
                    }`}
                    style={{ color: "#120309" }}
                    placeholder="Voer je wachtwoord in"
                    disabled={isSubmitting}
                    onFocus={(e) => {
                      if (!fieldErrors.password) {
                        const target = e.target as HTMLInputElement;
                        target.style.boxShadow =
                          "0 0 0 2px rgba(59, 130, 246, 0.5), 0 10px 25px rgba(59, 130, 246, 0.15)";
                        target.style.borderColor = "#3b82f6";
                      }
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = "";
                      target.style.borderColor = fieldErrors.password
                        ? "#fca5a5"
                        : "#d1d5db";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center cursor-pointer z-10"
                    disabled={isSubmitting}
                    style={{ width: "48px" }}
                  >
                    {showPassword ? (
                      <EyeOff
                        className="h-5 w-5 hover:opacity-70 transition-opacity duration-200"
                        style={{ color: "#67697c" }}
                      />
                    ) : (
                      <Eye
                        className="h-5 w-5 hover:opacity-70 transition-opacity duration-200"
                        style={{ color: "#67697c" }}
                      />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  boxShadow: "0 10px 25px rgba(59, 130, 246, 0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.boxShadow =
                      "0 15px 35px rgba(59, 130, 246, 0.35)";
                    target.style.background =
                      "linear-gradient(135deg, #2563eb, #1d4ed8)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.boxShadow =
                      "0 10px 25px rgba(59, 130, 246, 0.25)";
                    target.style.background =
                      "linear-gradient(135deg, #3b82f6, #2563eb)";
                  }
                }}
              >
                <div
                  className="absolute left-0 inset-y-0 flex items-center justify-center pointer-events-none"
                  style={{
                    width: "48px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                  }}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <LogIn className="h-5 w-5 text-white/80 group-hover:text-white transition-colors duration-200" />
                  )}
                </div>
                {isSubmitting ? "Bezig met inloggen..." : "Inloggen"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm" style={{ color: "#67697c" }}>
            Hulp nodig? Neem contact op met je werkgever.
          </p>
        </div>
      </div>
    </div>
  );
}
