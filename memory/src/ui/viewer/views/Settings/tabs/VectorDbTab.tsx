import React from 'react';
import { Card, CardBody, CardTitle, Select, Input, Button, Icon, Badge } from '../../../components/ui';

interface VectorDbTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

const vectorDbOptions = [
  { value: 'qdrant', label: 'Qdrant' },
  { value: 'chroma', label: 'ChromaDB' },
  { value: 'none', label: 'Disabled' },
];

const embeddingModelOptions = [
  { value: 'Xenova/all-MiniLM-L6-v2', label: 'MiniLM-L6-v2 (Default)' },
  { value: 'Xenova/all-mpnet-base-v2', label: 'MPNet Base v2' },
  { value: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', label: 'Multilingual MiniLM' },
];

export function VectorDbTab({ settings, onSettingChange }: VectorDbTabProps) {
  const currentDb = settings.CLAUDE_MEM_VECTOR_DB || 'qdrant';

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle>Vector Database</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Choose the vector database for semantic search
          </p>
          <Select
            label="Database Type"
            options={vectorDbOptions}
            value={currentDb}
            onChange={(e) => onSettingChange('CLAUDE_MEM_VECTOR_DB', e.target.value)}
          />
        </CardBody>
      </Card>

      {currentDb === 'qdrant' && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Qdrant Configuration</CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="space-y-4">
              <Input
                label="Host"
                value={settings.CLAUDE_MEM_QDRANT_HOST || 'localhost'}
                onChange={(e) => onSettingChange('CLAUDE_MEM_QDRANT_HOST', e.target.value)}
              />
              <Input
                label="Port"
                type="number"
                value={settings.CLAUDE_MEM_QDRANT_PORT || '6333'}
                onChange={(e) => onSettingChange('CLAUDE_MEM_QDRANT_PORT', e.target.value)}
              />
              <Input
                label="API Key (optional)"
                type="password"
                value={settings.CLAUDE_MEM_QDRANT_API_KEY || ''}
                onChange={(e) => onSettingChange('CLAUDE_MEM_QDRANT_API_KEY', e.target.value)}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {currentDb === 'chroma' && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>ChromaDB Configuration</CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="space-y-4">
              <Input
                label="Data Path"
                value={settings.CLAUDE_MEM_CHROMA_PATH || '~/.claude-mem/chroma'}
                onChange={(e) => onSettingChange('CLAUDE_MEM_CHROMA_PATH', e.target.value)}
              />
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <CardTitle>Embedding Model</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Model used for generating vector embeddings
          </p>
          <Select
            label="Model"
            options={embeddingModelOptions}
            value={settings.CLAUDE_MEM_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'}
            onChange={(e) => onSettingChange('CLAUDE_MEM_EMBEDDING_MODEL', e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Maintenance</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Vector database maintenance operations
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Icon icon="lucide:refresh-cw" size={16} className="mr-2" />
              Reindex All
            </Button>
            <Button variant="outline" size="sm">
              <Icon icon="lucide:trash-2" size={16} className="mr-2" />
              Clear Vectors
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
