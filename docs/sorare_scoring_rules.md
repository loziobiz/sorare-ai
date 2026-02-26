# Sorare Scoring Rules

## How does scoring work in Sorare Football?

Scoring in Sorare Football is a combination of two factors: the player score and the card score, which includes any applicable scoring bonuses for each of the five (5) cards in your lineup.

* The Player Score is based on how well a player performs on the pitch
* The Card Score includes the player score for that card plus any applicable bonuses (e.g. the captain that you choose for your lineup, current-season cards, XP, and collections)
* The team score is the addition of your five (5) card scores, and the team score is what determines your rank on the leaderboards

## **How is the Player Score calculated? (PS) ?**

**Player Score (PS)**

Sorare player scores (PS) are calculated based on the actual performances of the players during matches. The Sorare player score ranges from 0 to 100\.   

To calculate a player score, we use the following formula:

**Player Score = Decisive Score (DS) + All-Around Score (AAS)** \[or + zero if the AAS is negative\]

* The Decisive Score totals the statistics that have a direct impact on a match (for example, goal, decisive pass, red card)
* The All-Around Score totals the statistics during a match that are less obvious to follow but are valuable for evaluating a player's overall performance and his impact on a match
* The maximum Player Score is 100
* The minimum Player Score is 0
* If a player has two matches in a week, only one match will be counted for the score

**The Decisive Score:** 

The decisive scores follow a player's key contributions during a match. Players start at level 0 (35 points for a starter and 35 points for a substitute who comes on during the match).

Each positive impact statistic improves the player's score level; each negative impact statistic lowers the player's score to the previous level.   
  
Levels above 0 result in a guaranteed minimum score, regardless of the All-Around Score   
Levels below 0 result in a score that can be impacted by a negative All-Around Score  
  
**Example:** A player with 2 goals, 1 assist and a red card will end up at level 2 (70 points).

**Example:** A player who concedes 1 penalty and receives a red card will end up at level -2 (5 points)

**The Decisive Score is calculated using the following table:**

  | POSITIVE IMPACT               | NEGATIVE IMPACT            |
|-----------------------------|--------------------------|
| Goal                        | Red card                 |
| Assist                      | Own goal                 |
| Penalty Won                 | Penalty conceded         |
| Clearance off the line      | Error leads to a goal    |
| Cleansheet (only for GK)    |                          |
| Penalty save                |                          |
| Last man tackle             |                          |

  
**Global Score**

The All-Around Score takes into account secondary statistics that are more difficult to track during a live match. We use these statistics because we believe they offer, along with the Decisive Scores, a more accurate overall assessment of a player's impact on a match. The All-Around Score is currently calculated using the table below.  
  
_\*Please note that points for Clean Sheet apply if the player spends at least 60 minutes on the field (extra time excluded)_  
  
****  
_\*Open the image above in a new tab to enlarge the image_   

## How is the Card Score (CS) calculated?

Sorare Card Scores (SC) are calculated by taking the Player Score and adding any score bonus that this card may have - for example, Captains can receive score bonuses of 0%, 20% or 50% (depending on the competition entered), cards from an ongoing season receive score bonuses of 5%, and other cards can earn additional score bonuses if they have been trained.

For example, if you have a card with a 10% bonus and this player has obtained a Player Score of 70, the Card Score would be 77 (70 + 10% of 70).

You can learn more about bonuses [here](https://sorare.com/en/help/a/4402897813777/how-do-sorare-football-card-levels-xp-and-bonuses-work).

## What is a Double-Double in Sorare scoring?

Defensive players in Sorare Football can earn scoring bonuses based on the player's performance in real life during that Game Week - e.g. the Double, which is based on three categories: interceptions, won tackles, and net duels.

* **Double-Double (4 points):** At least two each from two of the three relevant categories (e.g. two interceptions, two tackles, but fewer than two net duels)
* **Triple-Double (6 points):** At least two each from all three categories (e.g. three interceptions, two tackles, three net duels)
* **Triple-Triple (12 points):** At least three each from all three categories (e.g. three interceptions, four tackles, three net duel


## Scoring Matrix

| CATEGORY       | METRIC                          | GOALKEEPER | DEFENDERS | MIDFIELDERS | FORWARDS |
|----------------|----------------------------------|----------|-----------|-------------|----------|
| GENERAL        | YELLOW_CARD                     | -3       | -3        | -3          | -3       |
| GENERAL        | FOULS                         | -1       | -2        | -1          | -0.5     |
| GENERAL        | WAS_FOULED                     | 0        | 0         | 1           | 1        |
| GENERAL        | ERROR_LEAD_TO_SHOT             | -5       | -5        | -3          | -3       |
| GENERAL        | CLEAN_SHEET_60                 | 0        | 10        | 0           | 0        |
| DEFENSIVE      | GOALS_CONCEDED                | -3       | -4        | -2          | 0        |
| DEFENSIVE      | EFFECTIVE_CLEARANCE           | 0        | 0.5       | 0           | 0        |
| DEFENSIVE      | WON_TACKLE                    | 0        | 3         | 3           | 0        |
| DEFENSIVE      | BLOCKED_CROSS                 | 0        | 1         | 1           | 0        |
| DEFENSIVE      | OUTFIELDER_BLOCK              | 0        | 2         | 1           | 0        |
| DEFENSIVE      | DOUBLE_DOUBLE                 | 0        | 4         | 4           | 4        |
| DEFENSIVE      | TRIPLE_DOUBLE                 | 0        | 6         | 6           | 6        |
| DEFENSIVE      | TRIPLE_TRIPLE                 | 0        | 12        | 12          | 12       |
| POSSESSION     | POSS_LOST_CTRL                | -0.3     | -0.6      | -0.5        | -0.1     |
| POSSESSION     | POSS_WON                      | 0        | 0.5       | 0.5         | 0        |
| POSSESSION     | DUEL_LOST                     | 0        | -2        | -0.8        | -1       |
| POSSESSION     | DUEL_WON                      | 0        | 1.5       | 0.8         | 1        |
| POSSESSION     | INTERCEPTION_WON              | 0        | 3         | 3           | 3        |
| PASSING        | BIG_CHANCE_CREATED            | 3        | 3         | 3           | 3        |
| PASSING        | ADJUSTED_TOTAL_ATT_ASSIST     | 2        | 3         | 2           | 2        |
| PASSING        | ACCURATE_PASS                 | 0.1      | 0.08      | 0.1         | 0.1      |
| PASSING        | SUCCESSFUL_FINAL_THIRD_PASSES | 0.5      | 0.4       | 0.3         | 0.1      |
| PASSING        | ACCURATE_LONG_BALLS           | 0.2      | 0.5       | 0.5         | 0        |
| PASSING        | LONG_PASS_OWN_TO_OPP_SUCCESS  | 0        | 0.5       | 0           | 0        |
| PASSING        | MISSED_PASS                   | -0.2     | -0.2      | -0.3        | 0        |
| ATTACKING      | ONTARGET_SCORING_ATT          | 3        | 3         | 3           | 3        |
| ATTACKING      | WON_CONTEST                 | 0        | 0.5       | 0.5         | 0.5      |
| ATTACKING      | PEN_AREA_ENTRIES            | 0        | 0.5       | 0.5         | 0.5      |
| ATTACKING      | PENALTY_KICK_MISSED         | -5       | -5        | -5          | -5       |
| ATTACKING      | BIG_CHANCE_MISSED           | -5       | -5        | -5          | -5       |
| GOALKEEPING    | SAVES                       | 2        | —         | —           | —        |
| GOALKEEPING    | SAVED_IBOX                  | 2        | —         | —           | —        |
| GOALKEEPING    | GOOD_HIGH_CLAIM             | 1.5      | —         | —           | —        |
| GOALKEEPING    | PUNCHES                     | 1.5      | —         | —           | —        |
| GOALKEEPING    | DIVE_SAVE                   | 3        | —         | —           | —        |
| GOALKEEPING    | DIVE_CATCH                  | 3.5      | —         | —           | —        |
| GOALKEEPING    | CROSS_NOT_CLAIMED           | -3       | —         | —           | —        |
| GOALKEEPING    | SIX_SECOND_VIOLATION        | -5       | —         | —           | —        |
| GOALKEEPING    | GK_SMOTHER                  | 5        | —         | —           | —        |
| GOALKEEPING    | ACCURATE_KEEPER_SWEEPER     | 3        | —         | —           | —        |

---

✅ Nota: Le celle vuote per i ruoli non applicabili (es. "Goalkeeping" per Defenders/Midfielders/Forwards) sono indicate con — per chiarezza. I valori sono presi esattamente dalle colonne "NEW" dell'immagine fornita.