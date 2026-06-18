import { StatusNotaRecebimento } from "@prisma/client";

import {
  canEditRecordDate,
  hasPermission,
  type PermissionAwareUser
} from "@/lib/permissions";

const MODULE_PERMISSION_PREFIX = "modulo.rastreabilidade";

export type ReceivingNoteEditAccessReason =
  | "EDITABLE"
  | "NO_USER"
  | "MONTH_SIGNED"
  | "FINALIZED"
  | "NO_PERMISSION";

type ReceivingNoteEditAccessParams = {
  user: PermissionAwareUser | null | undefined;
  noteDate: Date;
  statusNota: StatusNotaRecebimento;
  today: Date;
  monthSigned: boolean;
};

export function isReceivingNotePendingConference(statusNota: StatusNotaRecebimento): boolean {
  return statusNota !== StatusNotaRecebimento.FINALIZADA;
}

export function getReceivingNoteEditAccessReason(
  params: ReceivingNoteEditAccessParams
): ReceivingNoteEditAccessReason {
  if (!params.user) {
    return "NO_USER";
  }

  if (params.monthSigned) {
    return "MONTH_SIGNED";
  }

  if (!isReceivingNotePendingConference(params.statusNota)) {
    return "FINALIZED";
  }

  if (
    canEditRecordDate(
      params.user,
      MODULE_PERMISSION_PREFIX,
      params.noteDate,
      params.today
    )
  ) {
    return "EDITABLE";
  }

  const isPastOrCurrentNote = params.noteDate.getTime() <= params.today.getTime();
  if (
    isPastOrCurrentNote &&
    (hasPermission(params.user, `${MODULE_PERMISSION_PREFIX}.editar_registro_do_dia`) ||
      hasPermission(params.user, `${MODULE_PERMISSION_PREFIX}.editar_historico`))
  ) {
    return "EDITABLE";
  }

  return "NO_PERMISSION";
}

export function canEditReceivingNote(params: ReceivingNoteEditAccessParams): boolean {
  return getReceivingNoteEditAccessReason(params) === "EDITABLE";
}
