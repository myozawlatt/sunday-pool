'use client';

import { useActionState } from 'react';
import { addPlayer, deletePlayer, updatePlayer, type ActionState } from '@/app/manage/actions';
import { Avatar } from '@/components/Avatar';
import { HANDLE_MAX, QUOTE_MAX } from '@/lib/player-form';
import { profileHref } from '@/lib/players';
import type { Player } from '@/lib/types';
import { ConfirmButton } from './ConfirmButton';

const PHOTO_SIZE = 320;

/** Centre-crop to a square and shrink to 320px WebP so uploads stay tiny. */
async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const target = Math.min(PHOTO_SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = target;
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, target, target);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image.'))), 'image/webp', 0.85),
  );
}

/** Wraps a server action so the photo field is resized in the browser before it's sent. */
function withResizedPhoto(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  return async (prev: ActionState, formData: FormData): Promise<ActionState> => {
    const photo = formData.get('photo');
    if (photo instanceof File && photo.size > 0) {
      try {
        formData.set('photo', await resizePhoto(photo), 'avatar.webp');
      } catch {
        return { error: 'Could not read that image — try a JPG or PNG.' };
      }
    }
    return action(prev, formData);
  };
}

// Browser-side hint only; the server re-checks with readHandle (same rule as the DB).
const HANDLE_INPUT_PATTERN = '[A-Za-z0-9](?:[A-Za-z0-9\-]{0,28}[A-Za-z0-9])?';

/** Handle and quote inputs, shared by the add and edit forms. */
function ProfileFields({ player }: { player?: Player }) {
  return (
    <>
      <input
        className="input input--handle"
        name="handle"
        defaultValue={player?.handle}
        placeholder="handle, e.g. alex-tan"
        maxLength={HANDLE_MAX}
        pattern={HANDLE_INPUT_PATTERN}
        title="Letters, numbers and hyphens — shown in the profile link /player/handle"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        aria-label="Handle (profile link /player/handle)"
      />
      <textarea
        className="input input--quote"
        name="quote"
        defaultValue={player?.quote ?? ''}
        placeholder="Personal quote (optional)"
        maxLength={QUOTE_MAX}
        rows={2}
        lang="my"
        aria-label="Personal quote (optional)"
      />
    </>
  );
}

function Message({ state }: { state: ActionState }) {
  if (state?.error) return <p className="form-errors form-errors--inline" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="manage-sub" role="status">{state.ok}</p>;
  return null;
}

export function AddPlayerForm() {
  const [state, action, pending] = useActionState(withResizedPhoto(addPlayer), undefined);

  return (
    // key resets the inputs after a successful add
    <form className="player-add" action={action} key={state?.ok}>
      <input className="input input--name" name="name" placeholder="Player name" maxLength={60} required aria-label="Player name" />
      <ProfileFields />
      <input className="input" type="file" name="photo" accept="image/*" aria-label="Photo (optional)" />
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add player'}
      </button>
      <Message state={state} />
    </form>
  );
}

export function PlayerRowForm({ player }: { player: Player }) {
  const [saveState, saveAction, saving] = useActionState(withResizedPhoto(updatePlayer), undefined);
  const [deleteState, deleteAction] = useActionState(deletePlayer, undefined);
  const href = profileHref(player);

  return (
    <>
      <Avatar key={player.avatarUrl} player={player} size="md" />
      <form className="player-row__form" action={saveAction}>
        <input type="hidden" name="id" value={player.id} />
        <input className="input input--name" name="name" defaultValue={player.name} maxLength={60} required aria-label="Name" />
        <ProfileFields player={player} />
        <input className="input" type="file" name="photo" accept="image/*" aria-label={`New photo for ${player.name}`} />
        <button className="btn btn--small" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      <form className="player-row__delete" action={deleteAction}>
        <input type="hidden" name="id" value={player.id} />
        <ConfirmButton className="btn btn--small btn--danger" message={`Delete ${player.name}?`}>
          Delete
        </ConfirmButton>
      </form>
      {href && (
        <a className="player-row__profile" href={href} target="_blank" rel="noopener">
          View profile ↗
        </a>
      )}
      <Message state={deleteState ?? saveState} />
    </>
  );
}
