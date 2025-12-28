import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuildDetectorService } from '../strategy-intelligence/services/build-detector.service';
import { BuildGuidanceService, BuildGuidance } from './build-guidance.service';
import { GameStateService } from '../../core/services/game-state.service';

/**
 * Display state for the build identity panel
 */
interface BuildDisplay {
  type: string;
  confidence: number;
  guidance: BuildGuidance;
}

@Component({
  selector: 'app-build-identity',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="build-identity balatro-panel">
      <header class="header">
        <span class="section-header">Your Build</span>
      </header>

      @if (!primaryBuild()) {
        <div class="empty-state">
          <p class="empty-title">No build detected</p>
          <p class="empty-hint">
            Acquire jokers and shape your deck to develop a build identity.
          </p>
        </div>
      } @else {
        <!-- Primary Build -->
        <div class="primary-build">
          <div class="build-header">
            <span class="build-name">{{ primaryBuild()!.guidance.buildName }}</span>
            <span class="confidence">{{ primaryBuild()!.confidence }}%</span>
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="primaryBuild()!.confidence"
            ></div>
          </div>

          <p class="build-description">{{ primaryBuild()!.guidance.description }}</p>

          <div class="what-this-means">
            <span class="subsection-label">What This Means:</span>
            <ul class="bullet-list">
              @for (point of primaryBuild()!.guidance.whatThisMeans; track $index) {
                <li class="bullet-point">{{ point }}</li>
              }
            </ul>
          </div>

          @if (primaryBuild()!.guidance.strongestAsset) {
            <div class="strongest-asset">
              <span class="asset-label">Your Strongest:</span>
              <span class="asset-value">{{ primaryBuild()!.guidance.strongestAsset!.display }}</span>
            </div>
          }

          @if (primaryBuild()!.guidance.supportingJokers.length > 0) {
            <div class="supporting-jokers">
              <span class="jokers-label">Supporting Jokers:</span>
              <span class="joker-names">{{ formatJokerNames(primaryBuild()!.guidance) }}</span>
              @if (primaryBuild()!.guidance.jokersNeeded > 0) {
                <span class="jokers-needed">(+{{ primaryBuild()!.guidance.jokersNeeded }} more helps)</span>
              }
            </div>
          } @else if (primaryBuild()!.guidance.jokersNeeded > 0) {
            <div class="supporting-jokers">
              <span class="jokers-label">Supporting Jokers:</span>
              <span class="joker-names">None yet</span>
              <span class="jokers-needed">(find {{ primaryBuild()!.guidance.jokersNeeded }})</span>
            </div>
          }
        </div>

        <!-- Secondary Build (Hybrid) -->
        @if (isHybrid() && secondaryBuild()) {
          <div class="secondary-build">
            <div class="build-header">
              <span class="build-name">Secondary: {{ secondaryBuild()!.guidance.buildName }}</span>
              <span class="confidence">{{ secondaryBuild()!.confidence }}%</span>
            </div>

            <p class="build-description secondary-description">
              {{ secondaryBuild()!.guidance.description }}
            </p>
          </div>

          <div class="hybrid-advice">
            <p>{{ hybridAdvice() }}</p>
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .build-identity {
      padding: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .section-header {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .empty-state {
      text-align: center;
      padding: 24px 16px;
    }

    .empty-title {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      margin: 0 0 8px 0;
    }

    .empty-hint {
      color: rgba(255, 255, 255, 0.4);
      font-size: 11px;
      line-height: 1.4;
      margin: 0;
    }

    .primary-build {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
    }

    .build-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .build-name {
      font-size: 14px;
      font-weight: 700;
      color: #ffd700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .confidence {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffd700, #ffaa00);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .build-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 12px 0;
      line-height: 1.4;
    }

    .what-this-means {
      margin-bottom: 12px;
    }

    .subsection-label {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: block;
      margin-bottom: 6px;
    }

    .bullet-list {
      margin: 0;
      padding: 0 0 0 16px;
      list-style: none;
    }

    .bullet-point {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
      position: relative;
      padding-left: 4px;
    }

    .bullet-point::before {
      content: "\u2022";
      position: absolute;
      left: -12px;
      color: #ffd700;
    }

    .strongest-asset {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255, 215, 0, 0.1);
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .asset-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .asset-value {
      font-size: 12px;
      font-weight: 600;
      color: #ffd700;
    }

    .supporting-jokers {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    .jokers-label {
      color: rgba(255, 255, 255, 0.5);
    }

    .joker-names {
      color: rgba(255, 255, 255, 0.85);
      font-weight: 500;
    }

    .jokers-needed {
      color: rgba(255, 215, 0, 0.7);
      font-style: italic;
    }

    .secondary-build {
      margin-top: 12px;
      padding: 10px;
      background: rgba(100, 149, 237, 0.1);
      border-radius: 6px;
      border-left: 3px solid rgba(100, 149, 237, 0.5);
    }

    .secondary-build .build-name {
      font-size: 12px;
      color: #6495ed;
    }

    .secondary-build .confidence {
      font-size: 12px;
    }

    .secondary-description {
      font-size: 11px;
      margin: 6px 0 0 0;
    }

    .hybrid-advice {
      margin-top: 10px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
    }

    .hybrid-advice p {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      line-height: 1.4;
      font-style: italic;
    }
  `],
})
export class BuildIdentityComponent {
  private buildDetector = inject(BuildDetectorService);
  private buildGuidance = inject(BuildGuidanceService);
  private gameState = inject(GameStateService);

  /**
   * Current detected build from the build detector
   */
  private detectedBuild = this.buildDetector.detectedBuild;

  /**
   * Current jokers from game state
   */
  private jokers = this.gameState.jokers;

  /**
   * Primary build display data
   */
  primaryBuild = computed<BuildDisplay | null>(() => {
    const build = this.detectedBuild();
    if (!build.primary) {
      return null;
    }

    const guidance = this.buildGuidance.getGuidance(
      build.primary.type,
      build.primary,
      this.jokers()
    );

    return {
      type: build.primary.type,
      confidence: build.primary.confidence,
      guidance,
    };
  });

  /**
   * Secondary build display data (for hybrid builds)
   */
  secondaryBuild = computed<BuildDisplay | null>(() => {
    const build = this.detectedBuild();
    if (!build.secondary) {
      return null;
    }

    const guidance = this.buildGuidance.getGuidance(
      build.secondary.type,
      build.secondary,
      this.jokers()
    );

    return {
      type: build.secondary.type,
      confidence: build.secondary.confidence,
      guidance,
    };
  });

  /**
   * Whether the current build is a hybrid
   */
  isHybrid = computed(() => this.detectedBuild().isHybrid);

  /**
   * Advice for hybrid builds
   */
  hybridAdvice = computed(() => {
    const build = this.detectedBuild();
    if (!build.isHybrid || !build.primary || !build.secondary) {
      return '';
    }

    return this.buildGuidance.getHybridAdvice(
      build.primary.confidence,
      build.secondary.confidence
    );
  });

  /**
   * Format joker names with proper separators
   */
  formatJokerNames(guidance: BuildGuidance): string {
    const names = guidance.supportingJokers;
    if (names.length === 0) {
      return 'None';
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]}, ${names[1]}`;
    }
    return `${names[0]}, ${names[1]}, ${names[2]}`;
  }
}
