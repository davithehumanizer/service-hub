import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { AppDispatch, RootState } from "../../stores/globalStore";
import { prevStep } from "../../stores/repairWorkflowSlice";

/**
 * The wizard's own Back button. When this step's history entry was added on
 * leaving the previous step, it returns to that entry rather than adding one:
 * a new entry would make the browser's Back then lead forward.
 */
export const useWizardBack = () => {
  const dispatch = useDispatch<AppDispatch>();
  const history = useHistory();
  const location = useLocation<{ fromStep?: number } | undefined>();
  const step = useSelector((state: RootState) => state.repairWorkflow.step);
  return () => {
    if (step === 0) return;
    if (location.state?.fromStep === step - 1) history.goBack();
    else dispatch(prevStep());
  };
};
