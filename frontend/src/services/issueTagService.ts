import api from "./api";
import { API_URL } from "../utils/globals";

export interface IssueTagPrediction {
  label: string;
  score: number;
}

export interface IssueTagClassifyResponse {
  input: string;
  finalPrediction: IssueTagPrediction[];
  predictions: IssueTagPrediction[];
}

const issueTagService = {
  classify: async (input: string): Promise<IssueTagPrediction[]> => {
    const response = await api.post<IssueTagClassifyResponse>(
      `${API_URL}/v1/issue-tag/classify`,
      { input },
    );
    return response.data.finalPrediction ?? [];
  },
};

export default issueTagService;
