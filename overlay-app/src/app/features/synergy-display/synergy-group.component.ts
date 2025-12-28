import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { SynergyGroup } from '../../../../../shared/models/synergy-group.model';
import { JokerState } from '../../../../../shared/models/joker.model';
import { SynergyJokerCardComponent } from './synergy-joker-card.component';

@Component({
  selector: 'app-synergy-group',
  imports: [SynergyJokerCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="synergy-group" [class]="groupTypeClass()">
      <!-- Header -->
      <header class="group-header">
        <span class="group-label">{{ group().label }}</span>
        @if (group().strength) {
          <span class="strength-badge" [class]="'strength-' + group().strength">
            {{ strengthLabel() }}
          </span>
        }
      </header>

      <!-- Joker cards -->
      <div class="group-jokers">
        @for (joker of jokers(); track joker.id) {
          <app-synergy-joker-card
            [joker]="joker"
            [isOrphan]="group().type === 'orphan'"
          />
        }
      </div>

      <!-- Always-visible explanation -->
      <p class="group-explanation">{{ group().explanation }}</p>
    </div>
  `,
  styles: [`
    .synergy-group {
      padding: 10px;
      border-radius: 8px;
      background: rgba(20, 20, 35, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Direct synergy groups have stronger presence */
    .synergy-group.group-direct {
      border-color: rgba(212, 175, 55, 0.3);
      background: rgba(25, 25, 40, 0.95);
    }

    /* Strategy groups are neutral */
    .synergy-group.group-strategy {
      border-color: rgba(100, 150, 255, 0.2);
    }

    /* Orphan groups are dimmed */
    .synergy-group.group-orphan {
      opacity: 0.8;
      border-style: dashed;
      background: rgba(15, 15, 25, 0.8);
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .group-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .strength-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .strength-badge.strength-strong {
      background: rgba(255, 191, 0, 0.2);
      color: #ffbf00;
      border: 1px solid rgba(255, 191, 0, 0.3);
    }

    .strength-badge.strength-medium {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .strength-badge.strength-weak {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .group-jokers {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .group-explanation {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.4;
      margin: 0;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }

    /* Better explanation styling for direct synergies */
    .group-direct .group-explanation {
      color: rgba(255, 255, 255, 0.75);
      background: rgba(212, 175, 55, 0.1);
    }
  `]
})
export class SynergyGroupComponent {
  readonly group = input.required<SynergyGroup>();
  readonly jokers = input.required<JokerState[]>();

  readonly groupTypeClass = computed(() => `group-${this.group().type}`);

  readonly strengthLabel = computed(() => {
    const s = this.group().strength;
    if (s === 'strong') return 'Strong';
    if (s === 'medium') return 'Good';
    if (s === 'weak') return 'Weak';
    return '';
  });
}
