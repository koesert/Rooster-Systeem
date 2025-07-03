"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { useModal } from "@/contexts/ModalContext";
import {
  X,
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  CreateTimeOffRequestDto,
} from "@/types/timeoff";
import * as api from "@/lib/api";
import { toInputDateFormat, fromInputDateFormat } from "@/utils/dateUtils";

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeOffModal({ isOpen, onClose, onSuccess }: TimeOffModalProps) {
  const { user, isManager } = useAuth();
  const { showApiError } = useError();
  const { showAlert } = useModal();

  // Form state
  const [formData, setFormData] = useState<CreateTimeOffRequestDto>({
    reason: "",
    startDate: "",
    endDate: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        reason: "",
        startDate: "",
        endDate: "",
      });
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      errors.reason = "Reden is verplicht";
    } else if (formData.reason.length > 500) {
      errors.reason = "Reden mag maximaal 500 karakters zijn";
    }

    if (!formData.startDate) {
      errors.startDate = "Startdatum is verplicht";
    }

    if (!formData.endDate) {
      errors.endDate = "Einddatum is verplicht";
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate); // Input is already in YYYY-MM-DD format
      const endDate = new Date(formData.endDate); // Input is already in YYYY-MM-DD format

      if (endDate < startDate) {
        errors.endDate = "Einddatum moet na of gelijk aan startdatum zijn";
      }

      // Check maximum 8 weeks (56 days)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 56) {
        errors.endDate = "Maximaal 8 weken (56 dagen) aanvragen toegestaan";
      }

      // Check minimum 2 weeks in advance (only for non-managers)
      if (!isManager()) {
        const today = new Date();
        const minStartDate = new Date(
          today.getTime() + 14 * 24 * 60 * 60 * 1000
        );
        if (startDate < minStartDate) {
          errors.startDate =
            "Vrij moet minimaal 2 weken van tevoren worden aangevraagd";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateTimeOffRequestDto = {
        reason: formData.reason.trim(),
        startDate: fromInputDateFormat(formData.startDate), // Convert YYYY-MM-DD to DD-MM-YYYY
        endDate: fromInputDateFormat(formData.endDate), // Convert YYYY-MM-DD to DD-MM-YYYY
      };

      await api.createTimeOffRequest(requestData);

      showAlert({
        title: "Succes",
        message: "Vrij aanvraag succesvol aangemaakt",
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      });

      onSuccess();
      onClose();
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het aanmaken van de aanvraag"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateTimeOffRequestDto,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Nieuwe vrij aanvraag
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" style={{ color: "#d5896f" }} />
              Startdatum
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                formErrors.startDate
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              disabled={isSubmitting}
            />
            {formErrors.startDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {formErrors.startDate}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" style={{ color: "#d5896f" }} />
              Einddatum
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                formErrors.endDate
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              disabled={isSubmitting}
            />
            {formErrors.endDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {formErrors.endDate}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="h-4 w-4 inline mr-2" style={{ color: "#d5896f" }} />
              Reden
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              placeholder="Geef een reden voor je vrij aanvraag..."
              rows={4}
              maxLength={500}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none ${
                formErrors.reason ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              {formErrors.reason && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {formErrors.reason}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.reason.length}/500
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              disabled={isSubmitting}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #d5896f, #d5896f90)",
              }}
            >
              {isSubmitting ? "Aanmaken..." : "Aanvraag indienen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
