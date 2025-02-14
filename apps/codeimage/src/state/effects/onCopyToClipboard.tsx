import {useI18n} from '@codeimage/locale';
import {getInvertedThemeMode} from '@codeimage/store/ui';
import {toast} from '@codeimage/ui';
import {
  catchError,
  EMPTY,
  exhaustMap,
  from,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import {createRoot, getOwner, runWithOwner} from 'solid-js';
import {
  ExportExtension,
  exportImage,
  ExportMode,
  ExportOptions,
} from '../../hooks/use-export-image';
import {AppLocaleEntries} from '../../i18n';

interface CopyToClipboardEvent {
  ref: HTMLElement;
}

const event$ = new Subject<CopyToClipboardEvent>();

export function dispatchCopyToClipboard(event: CopyToClipboardEvent) {
  event$.next(event);
}

createRoot(() => {
  const owner = getOwner()!;
  event$
    .pipe(
      exhaustMap(({ref}) => {
        const options: ExportOptions = {
          mode: ExportMode.getBlob,
          quality: 100,
          pixelRatio: Math.floor(window.devicePixelRatio),
          extension: ExportExtension.png,
        };
        return from(
          runWithOwner(owner, () => exportImage({ref, options})),
        ).pipe(
          switchMap(data => {
            if (!(data instanceof Blob)) return EMPTY;
            return from(
              navigator.clipboard.write([
                new ClipboardItem(
                  {
                    [data.type]: data,
                  },
                  {presentationStyle: 'attachment'},
                ),
              ]),
            ).pipe(
              tap(() => runWithOwner(owner, openSnackbar)),
              catchError(() => EMPTY),
              tap(() => umami.trackEvent('true', `copy-to-clipboard`)),
            );
          }),
        );
      }),
    )
    .subscribe();
});

function openSnackbar(): void {
  toast.success(
    () => {
      const [t] = useI18n<AppLocaleEntries>();
      return t('canvas.copiedToClipboard');
    },
    {
      position: 'bottom-center',
      theme: getInvertedThemeMode(),
    },
  );
}
