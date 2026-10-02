import { Text } from '@/components/ui/text';
import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { NumberInput } from '@/components/self-ui/number-input';
import {
  PromptEditorModal,
  PromptEditorModalRef,
} from '@/features/ai-assistant/components/prompt-editor-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { Maximize2 } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface TextEncodeQwenImage21Props {
  node: Node;
  serverId: string;
  workflowId: string;
}

/**
 * Qwen-Image 2.1's text encoder (as opposed to `TextEncodeQwenImageEditPlus`,
 * which has its own component).
 *
 * Its `images` input is `COMFY_AUTOGROW_V3` — a resizable list of reference
 * image slots. That has no widget representation in the server's schema, so the
 * generic fallback can only dump its raw value; the reference images stay as
 * whatever the desktop workflow left there. Until the slot list is editable
 * here, say so instead of rendering JSON the user cannot act on.
 */
export default function TextEncodeQwenImage21({
  node,
  workflowId,
}: TextEncodeQwenImage21Props) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const promptEditorRef = useRef<PromptEditorModalRef>(null);

  const setInput = (key: string, value: unknown) =>
    updateNodeInput(workflowId, node.id, key, value);

  const handlePromptChange = useCallback(
    (text: string) => setInput('prompt', text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, node.id, updateNodeInput],
  );

  const handleOpenEditor = useCallback(() => {
    promptEditorRef.current?.present({
      initialValue: node.inputs?.prompt || '',
      onSave: handlePromptChange,
      title: 'Edit Prompt',
    });
  }, [node.inputs?.prompt, handlePromptChange]);

  const resolution = node.inputs?.resolution;

  return (
    <BaseNode node={node}>
      <SubItem
        title="Prompt"
        node={node}
        dependencies={['prompt']}
        rightComponent={
          <Pressable onPress={handleOpenEditor} className="p-1">
            <Icon as={Maximize2} size="sm" className="text-typography-500" />
          </Pressable>
        }
      >
        <StyledTextarea
          placeholder="Describe the edit, e.g. 把衣服换成红色连衣裙"
          value={node.inputs?.prompt || ''}
          onChangeText={handlePromptChange}
        />
      </SubItem>

      <SubItem title="Negative prompt" node={node} dependencies={['negative_prompt']}>
        <StyledTextarea
          placeholder="Optional"
          value={node.inputs?.negative_prompt || ''}
          onChangeText={(text) => setInput('negative_prompt', text)}
        />
      </SubItem>

      <SubItem title="resolution" node={node} dependencies={['resolution']}>
        <NumberInput
          value={typeof resolution === 'number' ? resolution : 1024}
          onChange={(next) => setInput('resolution', Number(next))}
          minValue={256}
          maxValue={4096}
          step={32}
          decimalPlaces={0}
          buttonSize={24}
          space={12}
        />
      </SubItem>

      <SubItem title="Reference images" node={node} dependencies={['images']}>
        <Text size="sm" className="text-typography-500">
          This node takes a variable number of reference image slots, which this
          app cannot edit yet. The images already set in the workflow are used
          as-is — change them on the desktop, then re-sync.
        </Text>
      </SubItem>

      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
