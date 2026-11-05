import { ApiReferenceOptions } from '@scalar/nestjs-api-reference';

export const scalarConfig: ApiReferenceOptions = {
  spec: {
    url: '/api/api-json',
  },
  customCss: `
    .scalar-api-reference .scalar-card .scalar-card-content {
      padding: 1.5rem;
    }
    .tool-integration-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1rem 0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .tool-integration-card h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .tool-integration-card p {
      margin: 0;
      opacity: 0.9;
    }
  `,
};
