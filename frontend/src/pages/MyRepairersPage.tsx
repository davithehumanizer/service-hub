import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Redirect } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, Button, Popover, Text } from "@mantine/core";
import DemoBadge from "../components/Devices/DemoBadge";
import { partnerTypeLabel } from "../components/Repairers/repairerFields";
import { useNotification } from "../context/NotificationContext";
import { OwnRepairer } from "../models/repairer";
import { repairerService } from "../services/repairerService";
import { RootState } from "../stores/globalStore";

const STATUS_COLOR = { pending: "yellow", published: "green", rejected: "red" } as const;

/**
 * The repairers one proposed and where their review stands: waiting,
 * published or refused with its reason, and any change still waiting.
 */
const MyRepairersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const user = useSelector((state: RootState) => state.auth.user);
  const [repairers, setRepairers] = useState<OwnRepairer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let current = true;
    repairerService
      .listMine()
      .then((mine) => current && setRepairers(mine))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [user]);

  if (!user) return <Redirect to="/login" />;

  const withdraw = async (id: string) => {
    setWithdrawing(id);
    try {
      await repairerService.withdrawProposal(id);
      setRepairers((list) => (list ?? []).filter((r) => r.repairer_id !== id));
      showNotification(t("myRepairers.withdrawn"), "success");
    } catch {
      showNotification(t("errors.generic"), "error");
    } finally {
      setWithdrawing(null);
      setConfirming(null);
    }
  };

  const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString(i18n.language) : "");

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center">
          <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400 mr-3">add_location_alt</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("myRepairers.title")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("myRepairers.intro")}</p>
          </div>
        </div>
        <Button component={Link} to="/app/repairers/new" leftSection={<span className="material-symbols-outlined text-base">add</span>}>
          {t("myRepairers.propose")}
        </Button>
      </div>

      {failed && <Text c="red">{t("errors.generic")}</Text>}
      {!failed && repairers === null && <div>{t("common.loading")}</div>}
      {repairers?.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl block mb-3">storefront</span>
          {t("myRepairers.empty")}
        </div>
      )}

      {repairers && repairers.length > 0 && (
        <ul className="space-y-4">
          {repairers.map((repairer) => {
            const status = repairer.status ?? "published";
            const revision = repairer.revision;
            return (
              <li
                key={repairer.repairer_id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{repairer.name}</h2>
                      <Badge color={STATUS_COLOR[status]} variant="light" size="sm">
                        {t(`myRepairers.status.${status}`)}
                      </Badge>
                      {repairer.is_demo && <DemoBadge size="sm" />}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {partnerTypeLabel(t, repairer.partner_type)} · {repairer.address}, {repairer.postal_code ?? ""} {repairer.city}
                    </p>
                    {repairer.created_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("myRepairers.proposedOn", { date: date(repairer.created_at) })}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {status === "published" && (
                      <Button component={Link} to={`/app/repairer/${repairer.repairer_id}`} variant="subtle" size="xs">
                        {t("myRepairers.view")}
                      </Button>
                    )}
                    <Button component={Link} to={`/app/repairers/${repairer.repairer_id}/edit`} variant="outline" size="xs">
                      {t("myRepairers.edit")}
                    </Button>
                    {status !== "published" && (
                      <Popover
                        opened={confirming === repairer.repairer_id}
                        onChange={(open) => !open && setConfirming(null)}
                        position="bottom-end"
                        withArrow
                        shadow="md"
                      >
                        <Popover.Target>
                          <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={() => setConfirming((c) => (c === repairer.repairer_id ? null : repairer.repairer_id))}
                          >
                            {t("myRepairers.withdraw")}
                          </Button>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Text size="sm" mb="sm" maw={240}>
                            {t("myRepairers.withdrawConfirm")}
                          </Text>
                          <div className="flex gap-2 justify-end">
                            <Button size="xs" variant="default" onClick={() => setConfirming(null)}>
                              {t("common.cancel")}
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              loading={withdrawing === repairer.repairer_id}
                              onClick={() => withdraw(repairer.repairer_id)}
                            >
                              {t("myRepairers.withdraw")}
                            </Button>
                          </div>
                        </Popover.Dropdown>
                      </Popover>
                    )}
                  </div>
                </div>

                {status === "rejected" && (
                  <Notice tone="red" title={t("myRepairers.rejectedHint")} note={repairer.review_note} />
                )}
                {revision?.status === "pending" && (
                  <Notice tone="yellow" title={t("myRepairers.changePending", { date: date(revision.created_at) })} />
                )}
                {revision?.status === "rejected" && (
                  <Notice tone="red" title={t("myRepairers.changeRejected")} note={revision.review_note} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const NOTICE = {
  red: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 text-red-800 dark:text-red-200",
  yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 text-yellow-800 dark:text-yellow-200",
};

/** Where a review stands, with the administrator's reason when there is one. */
const Notice: React.FC<{ tone: keyof typeof NOTICE; title: string; note?: string | null }> = ({ tone, title, note }) => {
  const { t } = useTranslation();
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${NOTICE[tone]}`}>
      <p>{title}</p>
      {note && <p className="mt-1">{t("myRepairers.reason", { note })}</p>}
    </div>
  );
};

export default MyRepairersPage;
