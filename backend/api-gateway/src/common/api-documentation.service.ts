import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApiDocumentationService {
  /**
   * Helper function to read markdown files from docs/tools directory
   */
  private readMarkdownFile(fileName: string): string {
    try {
      // In Docker environment, files are in /app/docs/tools/
      const filePath = path.join(process.cwd(), 'docs', 'tools', fileName);
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn(`Warning: Could not read ${fileName}:`, error);
      return `# Error loading ${fileName}\n\nThe documentation file could not be loaded.`;
    }
  }

  /**
   * Generate the complete tools documentation content
   */
  generateToolsDocumentation(): string {
    return `
## Integrated Tools & Services

Our platform connects with various external services to provide comprehensive repair and maintenance solutions.

### Available Integrations

#### Repair Map
**Service**: Fast Plan Eco Route Planning
**Purpose**: Find optimal routes to repairers and recycling centers
**API Endpoint**: \`GET /api/v1/fast-plan-eco/calculate-route\`
**Features**: GPX export, geocoding, multi-stop optimization

#### iFixit Integration
**Service**: External Adapters Service
**Purpose**: Access iFixit's extensive repair manuals and guides
**API Endpoint**: \`GET /api/v1/external-adapters/ifixit/search\`
**Features**: Device-specific repair guides, step-by-step instructions

#### Fixometer Analytics
**Service**: External Adapters Service
**Purpose**: Environmental impact tracking for repairs
**API Endpoint**: \`GET /api/v1/external-adapters/fixometer/impact\`
**Features**: Carbon footprint calculation, repair success metrics

#### Eco-Friendly Routing
**Service**: Fast Plan Eco Service
**Purpose**: Sustainable transportation planning
**API Endpoint**: \`POST /api/v1/fast-plan-eco/eco-route\`
**Features**: Electric vehicle optimization, emissions reduction

#### Device Photo Recognition
**Service**: Device Identification (AI — Google Gemini)
**Purpose**: Identify a device from an uploaded photo
**API Endpoint**: \`POST /api/v1/identification/analyze\`
**Features**: Brand, Model, GTIN, release date and end-of-life date extraction from images

#### Issue Origin Classifier
**Service**: Device Issue Tag (AI — fine-tuned RoBERTa)
**Purpose**: Predict the root cause of a device problem from a plain-text description
**API Endpoint**: \`POST /api/v1/issue-tag/classify\`
**Features**: 9 issue-origin categories (Mechanical, Electrical, Software…), confidence scores, full ranked predictions


${this.readMarkdownFile('index.md')}

---

${this.readMarkdownFile('roadmap.md')}

---

${this.readMarkdownFile('suggest-tool.md')}

---
`;
  }
}
