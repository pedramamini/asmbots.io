/**
 * The problem modal: the files or the bot that did not assemble, each with its assembler errors or
 * the reason it was not read. Its own chunk, with `Diagnostics`, loaded when a bot or a file first
 * fails.
 */
import { Modal } from '@asmbots/ui'
import { Diagnostics } from './Diagnostics'
import type { Problems } from './files'

export function ProblemsModal({ problems, onClose }: { problems: Problems; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={problems.title} size="lg">
      <ul className="flex flex-col gap-4">
        {problems.list.map((problem) => (
          <li key={problem.name} className="flex min-w-0 flex-col gap-2">
            <p className="text-bright">{problem.name}</p>
            {problem.reason === null ? (
              <Diagnostics source={problem.source} diagnostics={problem.diagnostics} />
            ) : (
              <p className="text-data text-danger">{problem.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
