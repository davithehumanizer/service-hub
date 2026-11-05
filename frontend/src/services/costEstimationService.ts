export const costEstimationService = {
  getEstimatedCost: async (
    repairType: "doItYourself" | "getHelp"
    //deviceModel: string
  ): Promise<{ minCost: number; maxCost: number }> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock data based on repair type and device model
    if (repairType === "doItYourself") {
      return { minCost: 20, maxCost: 80 };
    } else if (repairType === "getHelp") {
      return { minCost: 80, maxCost: 250 };
    }
    return { minCost: 0, maxCost: 0 };
  },
};

