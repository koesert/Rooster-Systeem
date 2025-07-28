"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation, ValidationConfigs } from "@/hooks/useValidation";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Edit,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  X,
  Shield,
  Calendar,
} from "lucide-react";
import { UpdateEmployeeRequest, Role, Employee } from "@/types/auth";
import * as api from "@/lib/api";
import { toInputDateFormat, fromInputDateFormat } from "@/utils/dateUtils";

export default function EditEmployeePage() {
  const params = useParams();
  const employeeId = parseInt(params.id as string);

  usePageTitle("Dashboard - Medewerker bewerken");

  const { user, isLoading, isManager, getRoleName } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // State for employee data
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  // Form state
  const [formData, setFormData] = useState<UpdateEmployeeRequest>({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    role: Role.Werknemer,
    hireDate: "",
    birthDate: "",
  });

  // Password confirmation state
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation setup - ONLY CHANGE
  const { fieldErrors, setFieldErrors, validateForm, clearAllErrors } =
    useValidation({
      ...ValidationConfigs.employeeEdit,
      validateOnChange: false, // Only validate on submit
    });

  // Check if current user is editing their own profile
  const isEditingSelf = user?.id === employeeId;
  const canEdit = isManager() || isEditingSelf;

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user && !canEdit) {
      router.push("/home");
    }
  }, [user, isLoading, router, canEdit]);

  const loadEmployee = useCallback(async () => {
    setIsLoadingEmployee(true);

    try {
      const employeeData = await api.getEmployeeById(employeeId);
      setEmployee(employeeData);

      // Pre-fill form with existing data
      setFormData({
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        username: employeeData.username,
        password: "", // Always empty for security
        role: employeeData.role,
        hireDate: employeeData.hireDate, // Keep in DD-MM-YYYY format
        birthDate: employeeData.birthDate, // Keep in DD-MM-YYYY format
      });
    } catch (error: unknown) {
      console.error("Error loading employee:", error);

      // Use centralized error handling
      showApiError(
        error,
        "Er is een fout opgetreden bij het laden van de medewerkersgegevens"
      );

      // Redirect back on error
      router.push("/employees");
    } finally {
      setIsLoadingEmployee(false);
    }
  }, [employeeId, showApiError, router]);

  // Load employee data
  useEffect(() => {
    if (user && canEdit) {
      loadEmployee();
    }
  }, [user, canEdit, employeeId, loadEmployee]);

  const handleInputChange = (
    field: keyof UpdateEmployeeRequest,
    value: string | Role
  ) => {
    // Store the value as-is, no conversion here for dates
    // HTML date inputs give us yyyy-MM-dd, we'll convert in handleSubmit
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      return;
    }

    // Prepare form data for validation
    const formDataForValidation = {
      ...formData,
      passwordOptional: formData.password, // Map to validation field name
      confirmPassword: confirmPassword,
      isManager: isManager(),
      isEditingSelf: isEditingSelf,
    };

    if (!validateForm(formDataForValidation)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create update payload based on user role
      let updateData: UpdateEmployeeRequest;

      if (isManager()) {
        // Managers can update everything - convert dates from HTML input format to API format
        updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          password: formData.password || undefined, // Only include password if provided
          role: formData.role,
          hireDate: fromInputDateFormat(formData.hireDate), // Convert yyyy-MM-dd to dd-MM-yyyy
          birthDate: fromInputDateFormat(formData.birthDate), // Convert yyyy-MM-dd to dd-MM-yyyy
        };
      } else {
        // Employees can only update username and password
        updateData = {
          firstName: employee!.firstName, // Keep existing values
          lastName: employee!.lastName,
          username: formData.username,
          password: formData.password || undefined,
          role: employee!.role,
          hireDate: employee!.hireDate,
          birthDate: employee!.birthDate,
        };
      }

      if (isEditingSelf) {
        // Use profile endpoint for self-updates (available to all authenticated users)
        await api.updateProfile(updateData);
      } else {
        // Use employee endpoint for managing other employees (managers only)
        await api.updateEmployee(employeeId, updateData);
      }

      // Go back to employees list after successful update
      router.push("/employees");
    } catch (error: unknown) {
      console.error("Error updating employee:", error);

      // Handle specific username conflict error
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        "message" in error
      ) {
        const errorWithDetails = error as { status: number; message: string };
        if (
          errorWithDetails.status === 400 &&
          errorWithDetails.message &&
          errorWithDetails.message.includes("Username") &&
          errorWithDetails.message.includes("already exists")
        ) {
          setFieldErrors({ username: "Deze gebruikersnaam bestaat al" });
        } else {
          // Use centralized error handling for all other errors
          showApiError(
            error,
            "Er is een fout opgetreden bij het bijwerken van de medewerker"
          );
        }
      } else {
        showApiError(
          error,
          "Er is een fout opgetreden bij het bijwerken van de medewerker"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isLoadingEmployee) {
    return <LoadingScreen message="Medewerker laden..." />;
  }

  if (!user || !canEdit || !employee) {
    return null;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)",
      }}
    >
      <Sidebar />

      <main className="layout-main-content overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
                style={{
                  background: "linear-gradient(135deg, #d5896f, #e8eef2)",
                }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15"
                style={{
                  background: "linear-gradient(45deg, #d5896f, #67697c)",
                }}
              ></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push("/employees")}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar medewerkerslijst"
                    >
                      <ArrowLeft
                        className="h-5 w-5"
                        style={{ color: "#67697c" }}
                      />
                    </button>
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #d5896f, #d5896f90)",
                      }}
                    >
                      <Edit className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1
                        className="text-4xl font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {employee.fullName} bewerken
                      </h1>
                      <p className="text-sm mt-1" style={{ color: "#67697c" }}>
                        {isEditingSelf
                          ? "Je bewerkt je eigen profiel"
                          : `Bewerk ${employee.fullName}'s profiel`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="space-y-8"
            >
              {/* Hidden honeypot fields to confuse autocomplete */}
              <div style={{ display: "none" }}>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  tabIndex={-1}
                />
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  tabIndex={-1}
                />
              </div>

              {/* Personal Information */}
              <div>
                <h3
                  className="text-xl font-semibold mb-6"
                  style={{ color: "#120309" }}
                >
                  Persoonlijke informatie
                  {!isManager() && (
                    <span
                      className="text-sm font-normal ml-2"
                      style={{ color: "#67697c" }}
                    >
                      (alleen-lezen)
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Voornaam{" "}
                      {isManager() && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User
                          className="h-5 w-5"
                          style={{ color: isManager() ? "#67697c" : "#9ca3af" }}
                        />
                      </div>
                      <input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        disabled={!isManager() || isSubmitting}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 ${
                          !isManager()
                            ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                            : fieldErrors.firstName
                            ? "border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                            : "border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                        }`}
                        style={{ color: isManager() ? "#120309" : "#9ca3af" }}
                        placeholder="Voornaam"
                        maxLength={50}
                        onFocus={(e) => {
                          if (isManager() && !fieldErrors.firstName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          if (isManager()) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = fieldErrors.firstName
                              ? "#fca5a5"
                              : "#d1d5db";
                          }
                        }}
                      />
                    </div>
                    {fieldErrors.firstName && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Achternaam{" "}
                      {isManager() && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User
                          className="h-5 w-5"
                          style={{ color: isManager() ? "#67697c" : "#9ca3af" }}
                        />
                      </div>
                      <input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        disabled={!isManager() || isSubmitting}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 ${
                          !isManager()
                            ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                            : fieldErrors.lastName
                            ? "border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                            : "border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                        }`}
                        style={{ color: isManager() ? "#120309" : "#9ca3af" }}
                        placeholder="Achternaam"
                        maxLength={50}
                        onFocus={(e) => {
                          if (isManager() && !fieldErrors.lastName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          if (isManager()) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = fieldErrors.lastName
                              ? "#fca5a5"
                              : "#d1d5db";
                          }
                        }}
                      />
                    </div>
                    {fieldErrors.lastName && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information - Editable */}
              <div>
                <h3
                  className="text-xl font-semibold mb-6"
                  style={{ color: "#120309" }}
                >
                  Account informatie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Gebruikersnaam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User
                          className="h-5 w-5"
                          style={{ color: "#67697c" }}
                        />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                          handleInputChange(
                            "username",
                            e.target.value.toLowerCase()
                          )
                        }
                        disabled={isSubmitting}
                        autoComplete="nope"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                          fieldErrors.username
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                        style={{ color: "#120309" }}
                        placeholder="bijv. john.doe"
                        maxLength={30}
                        onFocus={(e) => {
                          if (!fieldErrors.username) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
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
                    <p className="mt-2 text-xs" style={{ color: "#67697c" }}>
                      Minimaal 6 tekens. Alleen letters, cijfers, punten,
                      underscores en streepjes toegestaan
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Nieuw wachtwoord{" "}
                      <span className="text-gray-500">(optioneel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock
                          className="h-5 w-5"
                          style={{ color: "#67697c" }}
                        />
                      </div>
                      <input
                        id="password"
                        name="new-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                          fieldErrors.passwordOptional
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                        style={{ color: "#120309" }}
                        placeholder="Wachtwoord"
                        onFocus={(e) => {
                          if (!fieldErrors.passwordOptional) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = "";
                          target.style.borderColor =
                            fieldErrors.passwordOptional
                              ? "#fca5a5"
                              : "#d1d5db";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                        disabled={isSubmitting}
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
                    {fieldErrors.passwordOptional && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.passwordOptional}
                      </p>
                    )}
                    <p className="mt-2 text-xs" style={{ color: "#67697c" }}>
                      Minimaal 6 tekens met 1 hoofdletter en 1 cijfer
                    </p>
                  </div>
                </div>

                {/* Password Confirmation - only show if password is being changed */}
                {formData.password && (
                  <div className="mt-6">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Bevestig nieuw wachtwoord{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock
                          className="h-5 w-5"
                          style={{ color: "#67697c" }}
                        />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              confirmPassword: "",
                            }));
                          }
                        }}
                        disabled={isSubmitting}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                          fieldErrors.confirmPassword
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                        style={{ color: "#120309" }}
                        placeholder="Bevestig je nieuwe wachtwoord"
                        onFocus={(e) => {
                          if (!fieldErrors.confirmPassword) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = "";
                          target.style.borderColor = fieldErrors.confirmPassword
                            ? "#fca5a5"
                            : "#d1d5db";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? (
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
                    {fieldErrors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Role and Dates Information */}
              <div>
                <h3
                  className="text-xl font-semibold mb-6"
                  style={{ color: "#120309" }}
                >
                  {isManager() ? "Functie & gegevens" : "Gegevens"}
                  {!isManager() && (
                    <span
                      className="text-sm font-normal ml-2"
                      style={{ color: "#67697c" }}
                    >
                      (alleen-lezen)
                    </span>
                  )}
                </h3>
                <div
                  className={`grid grid-cols-1 ${
                    isManager() ? "md:grid-cols-3" : "md:grid-cols-2"
                  } gap-6`}
                >
                  {/* Role - Only show for managers */}
                  {isManager() && (
                    <div>
                      <label
                        htmlFor="role"
                        className="block text-sm font-semibold mb-2"
                        style={{ color: "#120309" }}
                      >
                        Rol <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Shield
                            className="h-5 w-5"
                            style={{ color: "#67697c" }}
                          />
                        </div>
                        <select
                          id="role"
                          value={formData.role}
                          onChange={(e) =>
                            handleInputChange(
                              "role",
                              parseInt(e.target.value) as Role
                            )
                          }
                          disabled={isSubmitting}
                          className="w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg border-gray-200"
                          style={{ color: "#120309" }}
                          onFocus={(e) => {
                            const target = e.target as HTMLSelectElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }}
                          onBlur={(e) => {
                            const target = e.target as HTMLSelectElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = "#d1d5db";
                          }}
                        >
                          <option value={Role.Werknemer}>
                            {getRoleName(Role.Werknemer)}
                          </option>
                          <option value={Role.ShiftLeider}>
                            {getRoleName(Role.ShiftLeider)}
                          </option>
                          <option value={Role.Manager}>
                            {getRoleName(Role.Manager)}
                          </option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Hire Date */}
                  <div>
                    <label
                      htmlFor="hireDate"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      In dienst sinds{" "}
                      {isManager() && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar
                          className="h-5 w-5"
                          style={{ color: isManager() ? "#67697c" : "#9ca3af" }}
                        />
                      </div>
                      {isManager() ? (
                        <input
                          id="hireDate"
                          type="date"
                          value={toInputDateFormat(formData.hireDate)}
                          onChange={(e) =>
                            handleInputChange("hireDate", e.target.value)
                          }
                          disabled={isSubmitting}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                            fieldErrors.hireDate
                              ? "border-red-300"
                              : "border-gray-200"
                          }`}
                          style={{ color: "#120309" }}
                          max={new Date().toISOString().split("T")[0]}
                          onFocus={(e) => {
                            if (!fieldErrors.hireDate) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow =
                                "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                              target.style.borderColor = "#d5896f";
                            }
                          }}
                          onBlur={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = fieldErrors.hireDate
                              ? "#fca5a5"
                              : "#d1d5db";
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={toInputDateFormat(formData.hireDate)}
                          disabled
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                    {fieldErrors.hireDate && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.hireDate}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label
                      htmlFor="birthDate"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Geboortedatum{" "}
                      {isManager() && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar
                          className="h-5 w-5"
                          style={{ color: isManager() ? "#67697c" : "#9ca3af" }}
                        />
                      </div>
                      {isManager() ? (
                        <input
                          id="birthDate"
                          type="date"
                          value={toInputDateFormat(formData.birthDate)}
                          onChange={(e) =>
                            handleInputChange("birthDate", e.target.value)
                          }
                          disabled={isSubmitting}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                            fieldErrors.birthDate
                              ? "border-red-300"
                              : "border-gray-200"
                          }`}
                          style={{ color: "#120309" }}
                          max={new Date().toISOString().split("T")[0]}
                          onFocus={(e) => {
                            if (!fieldErrors.birthDate) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow =
                                "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                              target.style.borderColor = "#d5896f";
                            }
                          }}
                          onBlur={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = fieldErrors.birthDate
                              ? "#fca5a5"
                              : "#d1d5db";
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={toInputDateFormat(formData.birthDate)}
                          disabled
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                    {fieldErrors.birthDate && (
                      <p className="mt-2 text-sm text-red-600">
                        {fieldErrors.birthDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between space-x-4 pt-6 border-t border-gray-200/50">
                <button
                  type="button"
                  onClick={() => router.push("/employees")}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 max-[500px]:space-x-0 px-6 py-3 max-[500px]:px-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="h-5 w-5" />
                  <span className="max-[500px]:hidden">Annuleren</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Opslaan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
