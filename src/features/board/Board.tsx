import { STAGES } from '../../shared/stages'
import { Column } from './Column'
import styles from './Board.module.css'

export function Board() {
  return (
    <div className={styles.board}>
      {STAGES.map((stage) => (
        <Column key={stage.id} stage={stage} count={0} />
      ))}
    </div>
  )
}
