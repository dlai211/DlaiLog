import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { AppModal } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProgressSlider, snapToStep, valueFromTap } from '@/components/ui/progress-slider';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { ToastProvider, useToast } from '@/components/ui/toast';

describe('Button', () => {
  it('reports presses, and stays quiet when disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button label="Save" onPress={onPress} testID="save" />);

    fireEvent.press(screen.getByTestId('save'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<Button label="Save" onPress={onPress} disabled testID="save" />);
    fireEvent.press(screen.getByTestId('save'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('save')).toBeDisabled();
  });
});

describe('AppModal', () => {
  it('renders nothing while closed, and its content while open', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <AppModal visible={false} title="Edit project" onClose={onClose} testID="modal">
        <Text>inside</Text>
      </AppModal>
    );
    expect(screen.queryByText('inside')).not.toBeOnTheScreen();

    rerender(
      <AppModal visible title="Edit project" onClose={onClose} testID="modal">
        <Text>inside</Text>
      </AppModal>
    );
    expect(screen.getByText('inside')).toBeOnTheScreen();
    expect(screen.getByText('Edit project')).toBeOnTheScreen();
  });

  it('closes from the ✕ button and from the backdrop', () => {
    const onClose = jest.fn();
    render(
      <AppModal visible title="Edit" onClose={onClose} testID="modal">
        <Text>inside</Text>
      </AppModal>
    );

    fireEvent.press(screen.getByTestId('modal-close'));
    fireEvent.press(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ConfirmDialog', () => {
  it('asks before doing anything and reports both answers', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        visible
        title="Delete this task?"
        message="This can't be undone."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("This can't be undone.")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('FormField', () => {
  it('reports typing and shows the required marker and error', () => {
    const onChangeText = jest.fn();
    render(
      <FormField
        label="Item name"
        required
        value=""
        onChangeText={onChangeText}
        error="Required"
        testID="name"
      />
    );

    expect(screen.getByText('Item name *')).toBeOnTheScreen();
    expect(screen.getByText('Required')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('name'), 'Soy sauce');
    expect(onChangeText).toHaveBeenCalledWith('Soy sauce');
  });
});

describe('Chip', () => {
  it('shows selected state and reports presses', () => {
    const onPress = jest.fn();
    render(<Chip label="Condiment" selected onPress={onPress} testID="chip" />);

    expect(screen.getByTestId('chip')).toBeSelected();
    fireEvent.press(screen.getByTestId('chip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Segmented', () => {
  function Host() {
    const [value, setValue] = useState<'day' | 'month'>('day');
    return (
      <Segmented
        options={[
          { value: 'day', label: 'Day' },
          { value: 'month', label: 'Month' },
        ]}
        value={value}
        onChange={setValue}
        testID="view"
      />
    );
  }

  it('switches the selection when another option is pressed', () => {
    render(<Host />);

    expect(screen.getByTestId('view-day')).toBeSelected();
    fireEvent.press(screen.getByTestId('view-month'));
    expect(screen.getByTestId('view-month')).toBeSelected();
    expect(screen.getByTestId('view-day')).not.toBeSelected();
  });
});

describe('ProgressBar', () => {
  it('reports its value and clamps out-of-range input', () => {
    const { rerender } = render(<ProgressBar value={72} testID="pb" />);
    expect(screen.getByTestId('pb').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 72 });

    rerender(<ProgressBar value={140} testID="pb" />);
    expect(screen.getByTestId('pb').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });

    rerender(<ProgressBar value={-10} testID="pb" />);
    expect(screen.getByTestId('pb').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });
  });
});

describe('ProgressSlider', () => {
  it('snaps to the nearest 5 and clamps to 0–100', () => {
    expect(snapToStep(43)).toBe(45);
    expect(snapToStep(41)).toBe(40);
    expect(snapToStep(-5)).toBe(0);
    expect(snapToStep(103)).toBe(100);
  });

  it('turns a position on the track into a value', () => {
    expect(valueFromTap(0, 200)).toBe(0);
    expect(valueFromTap(100, 200)).toBe(50);
    expect(valueFromTap(200, 200)).toBe(100);
    expect(valueFromTap(198, 200)).toBe(100);
    expect(valueFromTap(10, 0)).toBeNull();
  });

  function Host({ initial }: { initial: number }) {
    const [value, setValue] = useState(initial);
    return <ProgressSlider value={value} onChange={setValue} testID="slider" />;
  }

  it('nudges up and down in steps of 5', () => {
    render(<Host initial={40} />);

    expect(screen.getByTestId('slider-value')).toHaveTextContent('40%');
    fireEvent.press(screen.getByTestId('slider-increase'));
    expect(screen.getByTestId('slider-value')).toHaveTextContent('45%');
    fireEvent.press(screen.getByTestId('slider-decrease'));
    fireEvent.press(screen.getByTestId('slider-decrease'));
    expect(screen.getByTestId('slider-value')).toHaveTextContent('35%');
  });

  it('cannot go above 100', () => {
    render(<Host initial={100} />);
    fireEvent.press(screen.getByTestId('slider-increase'));
    expect(screen.getByTestId('slider-value')).toHaveTextContent('100%');
  });

  it('cannot go below 0', () => {
    render(<Host initial={0} />);
    fireEvent.press(screen.getByTestId('slider-decrease'));
    expect(screen.getByTestId('slider-value')).toHaveTextContent('0%');
  });
});

describe('EmptyState', () => {
  it('shows its message and hint', () => {
    render(<EmptyState emoji="🌤" message="Nothing planned today" hint="Add a task to get going" />);

    expect(screen.getByText('Nothing planned today')).toBeOnTheScreen();
    expect(screen.getByText('Add a task to get going')).toBeOnTheScreen();
  });
});

describe('Select', () => {
  function Host() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Select
        testID="unit"
        label="Unit"
        value={value}
        options={[
          { value: 'L', label: 'L' },
          { value: 'kg', label: 'kg' },
        ]}
        onChange={setValue}
      />
    );
  }

  it('opens a picker, reports the choice, and closes again', () => {
    render(<Host />);

    expect(screen.queryByTestId('unit-modal')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('unit'));
    expect(screen.getByTestId('unit-modal')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('unit-option-kg'));
    expect(screen.queryByTestId('unit-modal')).not.toBeOnTheScreen();
    expect(screen.getByText('kg')).toBeOnTheScreen();
  });
});

describe('Toast', () => {
  function Host() {
    const { showToast } = useToast();
    const [undoCount, setUndoCount] = useState(0);
    return (
      <>
        <Button
          label="Delete note"
          testID="trigger"
          onPress={() =>
            showToast('Note deleted', {
              actionLabel: 'Undo',
              onAction: () => setUndoCount((count) => count + 1),
              duration: 3000,
            })
          }
        />
        <Text testID="undo-count">{String(undoCount)}</Text>
      </>
    );
  }

  it('shows a message and runs the action when pressed', () => {
    render(
      <ToastProvider>
        <Host />
      </ToastProvider>
    );

    expect(screen.queryByTestId('toast')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Note deleted')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('toast-action'));
    expect(screen.getByTestId('undo-count')).toHaveTextContent('1');
    expect(screen.queryByTestId('toast')).not.toBeOnTheScreen();
  });

  it('disappears by itself after its duration', () => {
    jest.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Host />
        </ToastProvider>
      );

      fireEvent.press(screen.getByTestId('trigger'));
      expect(screen.getByTestId('toast')).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByTestId('toast')).not.toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
