import React from "react";
import { useTranslation } from "react-i18next";
import { Badge, MantineSize } from "@mantine/core";

/**
 * Says that what it marks was entered by a contributor: demonstration
 * data, removed in one purge at the end (docs/demo-data.md).
 */
const DemoBadge: React.FC<{ size?: MantineSize }> = ({ size = "sm" }) => {
  const { t } = useTranslation();
  return (
    <Badge size={size} radius="sm" variant="light" color="grape" title={t("demo.hint")}>
      {t("demo.badge")}
    </Badge>
  );
};

export default DemoBadge;
