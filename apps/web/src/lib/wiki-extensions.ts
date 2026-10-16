import { contentExtensions } from 'wiki-content'

import { mentionSuggestion } from './mention-suggestion'
import { normalizeLink } from './editor-link'

export { prepareWikiContent, CODE_LANGUAGES } from 'wiki-content'

export function wikiExtensions(editable: boolean) {
  return contentExtensions().map((extension) => {
    if (extension.name === 'starterKit')
      return extension.configure({
        codeBlock: false,
        link: {
          openOnClick: !editable,
          defaultProtocol: 'https',
          isAllowedUri: (url: string, context: { defaultValidate: (url: string) => boolean }) =>
            context.defaultValidate(url) && normalizeLink(url) !== null,
        },
      })
    if (extension.name === 'mention')
      return extension.configure({
        suggestion: editable ? mentionSuggestion : { char: '@', items: () => [] },
      })
    if (extension.name === 'image')
      return extension.configure({
        allowBase64: false,
        resize: editable
          ? {
              enabled: true,
              directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
              minWidth: 48,
              minHeight: 24,
              alwaysPreserveAspectRatio: true,
            }
          : false,
      })
    return extension
  })
}
