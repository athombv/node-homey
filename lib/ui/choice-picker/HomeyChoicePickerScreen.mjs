import { createElement } from 'react';
import { Box, Text, useStdout } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { HomeySelectOverflowMarker } from '../homey-select/HomeySelectOverflowMarker.mjs';
import { useHomeyChoicePickerInput } from './useHomeyChoicePickerInput.mjs';
import { useHomeyChoicePickerModel } from './choice-picker-store.mjs';
import {
  formatChoiceCountSummary,
  getChoicePickerFooterText,
  getChoicePickerLayout,
} from './choice-picker-view.mjs';

function HomeyChoicePickerHeader({ itemLabelPlural, itemLabelSingular, subtitle, title }) {
  const totalCount = useHomeyChoicePickerModel(1).totalCount;
  const visibleCount = useHomeyChoicePickerModel(1).visibleCount;
  const query = useHomeyChoicePickerModel(1).query;
  const countText = formatChoiceCountSummary(
    visibleCount,
    totalCount,
    itemLabelSingular,
    itemLabelPlural,
  );
  const filterText = query || `all ${itemLabelPlural.toLocaleLowerCase()}`;

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Text, { color: HOMEY_UI_THEME.highlight, bold: true }, title),
    createElement(
      Box,
      { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
      createElement(
        Box,
        { alignItems: 'center', flexGrow: 1, flexShrink: 1, marginRight: 2 },
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Filter: '),
        createElement(
          Box,
          { flexShrink: 1 },
          createElement(
            Text,
            {
              color: query ? HOMEY_UI_THEME.text : HOMEY_UI_THEME.textLight,
              wrap: 'truncate-end',
            },
            filterText,
          ),
        ),
      ),
      createElement(
        Box,
        { flexShrink: 0 },
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, countText),
      ),
    ),
    subtitle ? createElement(Text, { color: HOMEY_UI_THEME.textLight }, subtitle) : null,
  );
}

function HomeyChoicePickerEmptyState({ query }) {
  return createElement(
    Box,
    { flexDirection: 'column' },
    query
      ? createElement(Text, { color: HOMEY_UI_THEME.warning }, `No matches for "${query}".`)
      : createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'No options available.'),
    createElement(
      Text,
      { color: HOMEY_UI_THEME.textLight },
      query ? 'Press Esc to clear the query.' : 'Press Esc or Ctrl+C to cancel.',
    ),
  );
}

function HomeyChoicePickerList({ maxVisibleRows, mode }) {
  const model = useHomeyChoicePickerModel(maxVisibleRows);

  if (model.listState === 'empty') {
    return createElement(HomeyChoicePickerEmptyState, {
      query: model.query,
    });
  }

  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    model.hiddenAboveCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: model.hiddenAboveCount,
          direction: 'above',
        })
      : null,
    ...model.visibleChoices.map((choice, index) => {
      const isActive = model.activeChoice?.value === choice.value;
      const isChecked = mode === 'multi' && model.checkedValues.includes(choice.value);
      const indicator = mode === 'multi' ? (isChecked ? '●' : '○') : isActive ? '›' : ' ';
      const textColor = isActive ? HOMEY_UI_THEME.highlight : HOMEY_UI_THEME.text;

      return createElement(
        Box,
        {
          key: String(choice.value),
          width: '100%',
        },
        createElement(
          Text,
          {
            color: textColor,
            wrap: 'truncate-end',
          },
          `${indicator} ${choice.label}`,
        ),
      );
    }),
    model.hiddenBelowCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: model.hiddenBelowCount,
          direction: 'below',
        })
      : null,
  );
}

function HomeyChoicePickerFooter({ allowBack, mode, searchEnabled, submitLabel }) {
  const model = useHomeyChoicePickerModel(1);
  const text = getChoicePickerFooterText({
    allowBack,
    hasChoices: model.totalCount > 0,
    mode,
    query: model.query,
    searchEnabled,
    submitLabel,
  });

  return createElement(
    Box,
    {
      marginTop: 1,
    },
    createElement(Text, { color: HOMEY_UI_THEME.textLight, wrap: 'truncate-end' }, text),
  );
}

export function HomeyChoicePickerScreen({
  allowBack = false,
  itemLabelPlural,
  itemLabelSingular,
  mode = 'single',
  onBack,
  onCancel,
  onSubmit,
  searchEnabled = true,
  submitLabel = 'select',
  subtitle,
  title,
}) {
  const { stdout } = useStdout();
  const layout = getChoicePickerLayout({
    hasSubtitle: Boolean(subtitle),
    terminalRows: stdout.rows,
  });

  useHomeyChoicePickerInput({
    allowBack,
    mode,
    onBack,
    onCancel,
    onSubmit,
    searchEnabled,
  });

  return createElement(
    Box,
    {
      flexDirection: 'column',
      height: layout.terminalRows,
      width: '100%',
    },
    createElement(HomeyChoicePickerHeader, {
      itemLabelPlural,
      itemLabelSingular,
      subtitle,
      title,
    }),
    createElement(
      Box,
      {
        flexDirection: 'column',
        flexGrow: 1,
        marginTop: layout.listGapRows,
      },
      createElement(HomeyChoicePickerList, {
        maxVisibleRows: layout.maxVisibleRows,
        mode,
      }),
    ),
    createElement(HomeyChoicePickerFooter, {
      allowBack,
      mode,
      searchEnabled,
      submitLabel,
    }),
  );
}
