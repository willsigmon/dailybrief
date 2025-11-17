import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Clock } from "lucide-react";
import type { Alert } from "@/lib/trpc";

interface AlertItemProps {
  alert: Alert;
  onToggle: (id: number, completed: boolean) => void;
}

export const AlertItem = memo(function AlertItem({ alert, onToggle }: AlertItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <Checkbox
        checked={alert.completed}
        onCheckedChange={(checked) => onToggle(alert.id, checked === true)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h4 className="font-semibold text-gray-900 truncate">{alert.title}</h4>
        </div>
        {alert.description && (
          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
        )}
        {alert.actionRequired && (
          <p className="text-sm text-indigo-700 font-medium mb-2">{alert.actionRequired}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {alert.contactName && (
            <Badge variant="outline" className="text-xs">
              {alert.contactName}
            </Badge>
          )}
          {alert.organization && (
            <Badge variant="outline" className="text-xs">
              {alert.organization}
            </Badge>
          )}
          {alert.deadline && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Due: {new Date(alert.deadline).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
