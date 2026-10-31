/* Original Phase 2.7 draft repairs; never human approval or publication. */
(function(root){var data={
  "catalogVersion": 2,
  "packs": [
    {
      "schemaVersion": 1,
      "id": "p1-station-access",
      "version": 2,
      "lessonId": "cam17-t1-reading-p1",
      "theme": "An access team compares a transport junction and route choices",
      "title": "Station Access Audit",
      "briefing": "You are reviewing a fictional station-access file. Compare the junction observations and route choices, then write a careful note about access. Use only what each finding supports.",
      "debrief": "The access team can now describe the junction and its route choices more precisely. The mission does not prove that any route is always faster; revisit the language in fresh contexts.",
      "visual": "route",
      "publication": "draft",
      "review": {
        "status": "TEACHER_REVIEW",
        "approvedBy": null,
        "approvedAt": null,
        "approvedVersion": null,
        "rubric": {
          "grammar": "TEACHER_REVIEW",
          "sourceSense": "TEACHER_REVIEW",
          "collocations": "TEACHER_REVIEW",
          "uniqueKey": "TEACHER_REVIEW",
          "distractors": "TEACHER_REVIEW",
          "hints": "TEACHER_REVIEW",
          "recallVariants": "TEACHER_REVIEW",
          "morph": "TEACHER_REVIEW",
          "narrative": "TEACHER_REVIEW",
          "rights": "TEACHER_REVIEW"
        },
        "draftOrigin": "offline_ai_assisted_original_text",
        "technicalValidation": "run validator; never substitutes for teacher approval"
      },
      "rights": {
        "origin": "original_offline_authored",
        "copiedCambridgePassage": false,
        "externalArtwork": false
      },
      "terms": [
        {
          "senseId": "sense-e89a4b0bd00866e4982969c7",
          "sourceId": "C17-T1-R1-003",
          "term": "congested",
          "definition": "crowded with traffic or people",
          "sentence": "At the fictional Vale station, the junction is congested before the first train.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which finding follows from the log?",
            "options": [
              "Traffic has little room to move.",
              "Traffic has been diverted to a different junction.",
              "Traffic is flowing freely through the junction."
            ],
            "answer": 0,
            "clue": "Use the observation about available road space.",
            "why": "Congested describes traffic crowding the available road space; it does not mean that the junction is officially closed.",
            "context": "The observation log says the junction is congested, although every road remains open.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Complete the observation: The approach road became ___.",
            "options": [
              "congested",
              "congestion",
              "congesting"
            ],
            "answer": 0,
            "clue": "Describe the road after became.",
            "why": "The adjective congested describes the road; congestion is a noun.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "Cars filled every lane outside the arena and could barely move. The roads were ___.",
            "answers": [
              "congested"
            ],
            "clue": "Check that the adjective describes the person, place or thing in this sentence.",
            "why": "Congested is the adjective for a road crowded with traffic.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-19e7303e091b6ad30d33099e",
          "sourceId": "C17-T1-R1-006",
          "term": "network",
          "definition": "connected system of lines",
          "sentence": "The access team maps a network of paths connecting the stops.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which description captures the important relationship?",
            "options": [
              "A single path that ends at the station.",
              "A connected system of paths.",
              "Several separate paths with no junctions."
            ],
            "answer": 1,
            "clue": "Focus on how the separate paths relate to each other.",
            "why": "A network is a connected system; a timetable lists times and does not establish connections.",
            "context": "A route sketch shows paths joined by several crossing points.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "The",
              "form",
              "network",
              "the",
              "paths",
              "a",
              "around",
              "station."
            ],
            "answers": [
              "The paths form a network around the station."
            ],
            "clue": "Start with the paths, then describe their relationship.",
            "why": "A network describes the connected arrangement of paths.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "Trails joined at dozens of crossing points throughout the forest. Together they formed a ___.",
            "answers": [
              "network"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Network names a system whose parts connect.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-a62397cd8498372a644abfe4",
          "sourceId": "C17-T1-R1-008",
          "term": "passenger",
          "definition": "person travelling in a vehicle",
          "sentence": "Each passenger receives a small map at the stop.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Who is a passenger here?",
            "options": [
              "A member of staff operating the service.",
              "A member of staff servicing the vehicle.",
              "A person travelling on the service."
            ],
            "answer": 2,
            "clue": "Consider the traveller’s role on board.",
            "why": "In this context a passenger travels in the vehicle without being the driver or crew.",
            "context": "A boarding note separates the people making the journey from the staff operating the vehicle.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Complete the instruction for one traveller: Each ___ needs a map.",
            "options": [
              "passenger",
              "passengers",
              "passenger travels"
            ],
            "answer": 0,
            "clue": "Each is followed by a singular count noun.",
            "why": "Each passenger is singular; the following verb needs agrees with it.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The driver checked the ticket of each ___ before letting them take a seat on the coach.",
            "answers": [
              "passenger"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Passenger fits the singular position after every; passengers does not.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-68a92b316178a7ba875a347a",
          "sourceId": "C17-T1-R1-060",
          "term": "route",
          "definition": "path followed by transport",
          "sentence": "The team traces a route from the stop to the library.",
          "investigate": {
            "kind": "meaning",
            "prompt": "What does the marked route show?",
            "options": [
              "The stopping times of the service.",
              "The path the service follows.",
              "The total distance travelled in a year."
            ],
            "answer": 1,
            "clue": "Consider what the line on the service map represents.",
            "why": "A transport route is the path followed by the service, rather than its price or staffing.",
            "context": "The map marks the path followed by the connecting bus.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "paraphrase",
            "prompt": "Which memo preserves the meaning of route?",
            "options": [
              "The bus makes the trip at these times.",
              "The bus charges this fare for the trip.",
              "The bus follows this path through the district."
            ],
            "answer": 2,
            "clue": "Keep the idea of a path followed by transport.",
            "why": "Only the last memo identifies the path followed; a timetable and a fare describe different aspects of the same service.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The road by the river is closed, so the bus must follow a different ___ through the town.",
            "answers": [
              "route"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Route names the path a transport service follows.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-9be946e9caf16f0abc73d55d",
          "sourceId": "C17-T1-R1-089",
          "term": "alternative",
          "definition": "other possible option",
          "sentence": "A second path offers an alternative when the main approach is busy.",
          "investigate": {
            "kind": "meaning",
            "prompt": "What does alternative mean in this memo?",
            "options": [
              "The only option that may be used.",
              "An option known to be quicker in every case.",
              "Another possible option."
            ],
            "answer": 2,
            "clue": "Separate having another choice from knowing it will be faster.",
            "why": "An alternative is another possible option; the word alone does not guarantee a faster journey.",
            "context": "The access memo offers another possible path instead of the usual approach.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "We",
              "an",
              "to",
              "main",
              "need",
              "alternative",
              "the",
              "route."
            ],
            "answers": [
              "We need an alternative to the main route."
            ],
            "clue": "Build the statement about another option.",
            "why": "An alternative to introduces the option that could be used instead.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The lift is unavailable, but the ramp offers an ___ for anyone who cannot use the stairs.",
            "answers": [
              "alternative"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Alternative is a singular noun here and is commonly followed by to.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        }
      ],
      "context": [
        {
          "senseId": "sense-072cc7ecf79926dc8c3b4035",
          "sourceId": "C17-T1-R1-004",
          "sentence": "An expansion of the fictional service is under discussion."
        },
        {
          "senseId": "sense-97e16630481da84aaa89c941",
          "sourceId": "C17-T1-R1-005",
          "sentence": "The review concerns an overground railway near Vale."
        }
      ],
      "morph": [
        {
          "senseId": "sense-e89a4b0bd00866e4982969c7",
          "form": "congestion",
          "definition": "noun: traffic crowding that makes movement difficult",
          "partOfSpeech": "noun",
          "attestationRef": "cambridge-congestion",
          "discover": {
            "kind": "recall",
            "prompt": "Use the noun: Traffic ___ slowed the station approach.",
            "answers": [
              "congestion"
            ],
            "clue": "The gap names the traffic condition.",
            "why": "Traffic congestion names the condition; congested is an adjective.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "transform": {
            "kind": "recall",
            "prompt": "Transform the adjective into a noun: The road was congested. There was heavy traffic ___.",
            "answers": [
              "congestion"
            ],
            "clue": "Name the condition after traffic.",
            "why": "The noun congestion completes traffic congestion.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "recall": {
            "kind": "recall",
            "prompt": "Vehicles stood nose to tail around the stadium. Severe traffic ___ delayed the ambulance.",
            "answers": [
              "congestion"
            ],
            "clue": "Name the traffic condition after by.",
            "why": "Congestion is the noun used for the traffic condition.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "extra": {
            "kind": "recall",
            "prompt": "Cars crowded every lane near the market; the diversion was intended to reduce traffic ___.",
            "answers": [
              "congestion"
            ],
            "clue": "A noun is needed as the object.",
            "why": "Congestion names what was reduced.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          }
        }
      ],
      "contentHistory": [
        {
          "version": 1,
          "terms": [
            {
              "senseId": "sense-e89a4b0bd00866e4982969c7",
              "sourceId": "C17-T1-R1-003",
              "term": "congested",
              "definition": "crowded with traffic or people",
              "sentence": "At the fictional Vale station, the junction is congested before the first train.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which finding follows from the log?",
                "options": [
                  "Traffic has little room to move.",
                  "The junction is legally closed.",
                  "There is no traffic near the station."
                ],
                "answer": 0,
                "clue": "Distinguish difficulty moving from an official closure.",
                "why": "Congested describes traffic crowding the available road space; it does not mean that the junction is officially closed.",
                "context": "The observation log says the junction is congested, although every road remains open.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Complete the observation: The approach road became ___.",
                "options": [
                  "congested",
                  "congestion",
                  "congesting"
                ],
                "answer": 0,
                "clue": "Describe the road after became.",
                "why": "The adjective congested describes the road; congestion is a noun.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the adjective for crowded traffic: At closing time, the museum approach was ___.",
                "answers": [
                  "congested"
                ],
                "clue": "Describe the approach, rather than name the condition.",
                "why": "Congested is the adjective for a road crowded with traffic.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-19e7303e091b6ad30d33099e",
              "sourceId": "C17-T1-R1-006",
              "term": "network",
              "definition": "connected system of lines",
              "sentence": "The access team maps a network of paths connecting the stops.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which description captures the important relationship?",
                "options": [
                  "A list of unrelated departure times.",
                  "A connected system of paths.",
                  "One path with no connections."
                ],
                "answer": 1,
                "clue": "Follow the links between the paths.",
                "why": "A network is a connected system; a timetable lists times and does not establish connections.",
                "context": "A route sketch shows paths joined by several crossing points.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "The",
                  "form",
                  "network",
                  "the",
                  "paths",
                  "a",
                  "around",
                  "station."
                ],
                "answers": [
                  "The paths form a network around the station."
                ],
                "clue": "Start with the paths, then describe their relationship.",
                "why": "A network describes the connected arrangement of paths.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the noun for a connected system: The cycle paths form a ___ across the district.",
                "answers": [
                  "network"
                ],
                "clue": "Focus on the links, not the departure times.",
                "why": "Network names a system whose parts connect.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-a62397cd8498372a644abfe4",
              "sourceId": "C17-T1-R1-008",
              "term": "passenger",
              "definition": "person travelling in a vehicle",
              "sentence": "Each passenger receives a small map at the stop.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Who is a passenger here?",
                "options": [
                  "A person repairing the vehicle in a depot.",
                  "A person driving the vehicle.",
                  "A person travelling on the service."
                ],
                "answer": 2,
                "clue": "Identify who is making the journey without operating the vehicle.",
                "why": "In this context a passenger travels in the vehicle without being the driver or crew.",
                "context": "A boarding note separates the people making the journey from the staff operating the vehicle.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Complete the instruction for one traveller: Each ___ needs a map.",
                "options": [
                  "passenger",
                  "passengers",
                  "passenger travels"
                ],
                "answer": 0,
                "clue": "Each is followed by a singular count noun.",
                "why": "Each passenger is singular; the following verb needs agrees with it.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the singular noun: Every ___ received a seat number before departure.",
                "answers": [
                  "passenger"
                ],
                "clue": "The gap identifies one traveller after every.",
                "why": "Passenger fits the singular position after every; passengers does not.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-68a92b316178a7ba875a347a",
              "sourceId": "C17-T1-R1-060",
              "term": "route",
              "definition": "path followed by transport",
              "sentence": "The team traces a route from the stop to the library.",
              "investigate": {
                "kind": "meaning",
                "prompt": "What does the marked route show?",
                "options": [
                  "The vehicle fare.",
                  "The path the service follows.",
                  "The total number of staff."
                ],
                "answer": 1,
                "clue": "Look at where the service goes.",
                "why": "A transport route is the path followed by the service, rather than its price or staffing.",
                "context": "The map marks the path followed by the connecting bus.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "paraphrase",
                "prompt": "Which memo preserves the meaning of route?",
                "options": [
                  "The bus fare is printed on the ticket.",
                  "The bus staff have changed shifts.",
                  "The bus follows this path through the district."
                ],
                "answer": 2,
                "clue": "Keep the idea of a path followed by transport.",
                "why": "The third memo describes the route; fares and shifts describe different aspects of the service.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the noun for a transport path: The revised bus ___ passes the sports hall.",
                "answers": [
                  "route"
                ],
                "clue": "The gap concerns where the bus goes.",
                "why": "Route names the path a transport service follows.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-9be946e9caf16f0abc73d55d",
              "sourceId": "C17-T1-R1-089",
              "term": "alternative",
              "definition": "other possible option",
              "sentence": "A second path offers an alternative when the main approach is busy.",
              "investigate": {
                "kind": "meaning",
                "prompt": "What does alternative mean in this memo?",
                "options": [
                  "A guaranteed faster journey.",
                  "A temporary ban on travelling.",
                  "Another possible option."
                ],
                "answer": 2,
                "clue": "Separate having another choice from knowing it will be faster.",
                "why": "An alternative is another possible option; the word alone does not guarantee a faster journey.",
                "context": "The access memo offers another possible path instead of the usual approach.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "We",
                  "an",
                  "to",
                  "main",
                  "need",
                  "alternative",
                  "the",
                  "route."
                ],
                "answers": [
                  "We need an alternative to the main route."
                ],
                "clue": "Build the statement about another option.",
                "why": "An alternative to introduces the option that could be used instead.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the noun for another possible choice: A walking path provides an ___ to the crowded bus.",
                "answers": [
                  "alternative"
                ],
                "clue": "The gap follows an and names a choice.",
                "why": "Alternative is a singular noun here and is commonly followed by to.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            }
          ],
          "morph": [
            {
              "senseId": "sense-e89a4b0bd00866e4982969c7",
              "form": "congestion",
              "definition": "noun: traffic crowding that makes movement difficult",
              "partOfSpeech": "noun",
              "attestationRef": "cambridge-congestion",
              "discover": {
                "kind": "recall",
                "prompt": "Use the noun: Traffic ___ slowed the station approach.",
                "answers": [
                  "congestion"
                ],
                "clue": "The gap names the traffic condition.",
                "why": "Traffic congestion names the condition; congested is an adjective.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "transform": {
                "kind": "recall",
                "prompt": "Transform the adjective into a noun: The road was congested. There was heavy traffic ___.",
                "answers": [
                  "congestion"
                ],
                "clue": "Name the condition after traffic.",
                "why": "The noun congestion completes traffic congestion.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "recall": {
                "kind": "recall",
                "prompt": "Independent recall: The delivery was delayed by ___ at the junction.",
                "answers": [
                  "congestion"
                ],
                "clue": "Name the traffic condition after by.",
                "why": "Congestion is the noun used for the traffic condition.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "extra": {
                "kind": "recall",
                "prompt": "One more context: The route change reduced traffic ___ near the gate.",
                "answers": [
                  "congestion"
                ],
                "clue": "A noun is needed as the object.",
                "why": "Congestion names what was reduced.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              }
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 1,
      "id": "p1-community-room",
      "version": 2,
      "lessonId": "cam17-t1-reading-p1",
      "theme": "A community class chooses a suitable larger site",
      "title": "A New Home for Evening Classes",
      "briefing": "A fictional evening class needs a larger room. Review the location notes and the agreed move, then help the organisers describe the plan accurately. This is a language case, not a claim about a real council.",
      "debrief": "The organisers now have a clearer account of the agreed move and the new site. Language evidence here is task-specific; it does not establish mastery or endorse a real housing policy.",
      "visual": "community",
      "publication": "draft",
      "review": {
        "status": "TEACHER_REVIEW",
        "approvedBy": null,
        "approvedAt": null,
        "approvedVersion": null,
        "rubric": {
          "grammar": "TEACHER_REVIEW",
          "sourceSense": "TEACHER_REVIEW",
          "collocations": "TEACHER_REVIEW",
          "uniqueKey": "TEACHER_REVIEW",
          "distractors": "TEACHER_REVIEW",
          "hints": "TEACHER_REVIEW",
          "recallVariants": "TEACHER_REVIEW",
          "morph": "TEACHER_REVIEW",
          "narrative": "TEACHER_REVIEW",
          "rights": "TEACHER_REVIEW"
        },
        "draftOrigin": "offline_ai_assisted_original_text",
        "technicalValidation": "run validator; never substitutes for teacher approval"
      },
      "rights": {
        "origin": "original_offline_authored",
        "copiedCambridgePassage": false,
        "externalArtwork": false
      },
      "terms": [
        {
          "senseId": "sense-0565f5e877495423f1f8e0ea",
          "sourceId": "C17-T1-R1-015",
          "term": "overcrowded",
          "definition": "having too many people",
          "sentence": "In fictional Rowan, the evening classroom is overcrowded.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which interpretation fits overcrowded?",
            "options": [
              "Too many people are using the space.",
              "The space has more seats than people.",
              "The space is busy but has room for everyone."
            ],
            "answer": 0,
            "clue": "Compare the number of people with the available space.",
            "why": "Overcrowded means there are too many people for the space; it does not mean that the building is closed.",
            "context": "The attendance note says there are more learners than the room can comfortably hold.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Complete the note: The small room is ___.",
            "options": [
              "overcrowded",
              "overcrowd",
              "overcrowding people"
            ],
            "answer": 0,
            "clue": "Describe the room after is.",
            "why": "Overcrowded is the adjective that describes a space containing too many people.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "Visitors could hardly turn around and queues blocked the aisles. The exhibition hall was ___.",
            "answers": [
              "overcrowded"
            ],
            "clue": "Check that the adjective describes the person, place or thing in this sentence.",
            "why": "Overcrowded describes the gallery, not an action performed by a visitor.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-3d666ffd6243e5eae8122ec5",
          "sourceId": "C17-T1-R1-030",
          "term": "relocate",
          "definition": "move to a new place",
          "sentence": "With the learners’ agreement, the organisers plan to relocate the classes.",
          "investigate": {
            "kind": "meaning",
            "prompt": "What does relocate describe?",
            "options": [
              "Change the times while keeping the same venue.",
              "Move them to a new place.",
              "Change the teachers while keeping the same venue."
            ],
            "answer": 1,
            "clue": "Look for a change of place, not a cancellation.",
            "why": "Relocate means move to a new place; it does not by itself mean cancel or end the activity.",
            "context": "The organisers intend to move the classes from their current room to a different site.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "We",
              "relocate",
              "classes",
              "month.",
              "will",
              "the",
              "next"
            ],
            "answers": [
              "We will relocate the classes next month."
            ],
            "clue": "Start with who will make the move.",
            "why": "Relocate takes the classes as its object in this memo.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The old office lease expires in June. The company will ___ its staff to the building across town.",
            "answers": [
              "relocate"
            ],
            "clue": "Check the verb form and any required small words against the sentence around the gap.",
            "why": "Relocate is the base verb needed after plans to.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-671cec8bff9f6329a6dbfc5e",
          "sourceId": "C17-T1-R1-033",
          "term": "suburb",
          "definition": "residential area outside city centre",
          "sentence": "The chosen suburb has a site beside an existing bus stop.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which description matches suburb?",
            "options": [
              "A mainly commercial district in the city centre.",
              "A rural settlement well beyond the urban area.",
              "A residential area beyond the city centre."
            ],
            "answer": 2,
            "clue": "Compare the area’s main use and position.",
            "why": "Suburb refers to a residential area outside the city centre; capital and tunnel refer to different concepts.",
            "context": "The location note describes a residential area outside the city centre.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "paraphrase",
            "prompt": "Which site note keeps the meaning?",
            "options": [
              "The hall is in a residential district outside the centre.",
              "The hall is in a commercial district in the centre.",
              "The hall is in a rural village beyond the urban area."
            ],
            "answer": 0,
            "clue": "Preserve both the residential character and the location.",
            "why": "A suburb is residential and outside the city centre; neither a central commercial district nor a separate rural village matches both features.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "Most homes in the district lie outside the city centre, and residents commute in each morning. It is a residential ___.",
            "answers": [
              "suburb"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Suburb names the residential area; hall names the building in it.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-d6d03481b171a5f596024d5b",
          "sourceId": "C17-T1-R1-034",
          "term": "provide",
          "definition": "make available",
          "sentence": "The council will provide the site for the classes.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which action does provide describe?",
            "options": [
              "Charge the organisers for preparing their own site.",
              "Make the space available to them.",
              "Reserve the space for a different group."
            ],
            "answer": 1,
            "clue": "Consider whether the organisers gain access to the resource.",
            "why": "Provide means make something available, as the council does with the site in the memo.",
            "context": "A council memo makes the space available for the organisers to use.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "The",
              "will",
              "space",
              "the",
              "council",
              "provide",
              "for",
              "classes."
            ],
            "answers": [
              "The council will provide space for the classes."
            ],
            "clue": "Place the resource after the action.",
            "why": "Provide space for states what is made available and who it is for.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The venue already has chairs, but the school will ___ tables for the workshop so nobody needs to bring one.",
            "answers": [
              "provide"
            ],
            "clue": "Check the verb form and any required small words against the sentence around the gap.",
            "why": "Provide fits after will; tables is the resource being made available.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-58da02c350f91fff6e6e34d5",
          "sourceId": "C17-T1-R1-043",
          "term": "construct",
          "definition": "build something",
          "sentence": "Volunteers will construct a larger community room there.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which action matches construct?",
            "options": [
              "Repair an existing room without enlarging it.",
              "Convert an existing room to a different use.",
              "Build the planned room."
            ],
            "answer": 2,
            "clue": "Distinguish making the structure from naming or removing it.",
            "why": "Construct means build; it does not mean demolish or merely rename.",
            "context": "The final proposal describes building a room on the chosen site.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Complete the memo: The team plans to ___ a new room.",
            "options": [
              "construction",
              "construct",
              "constructs"
            ],
            "answer": 1,
            "clue": "The gap follows plans to and precedes an object.",
            "why": "Construct is the base verb after to; construction is the process noun.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "There is currently no shelter at the stop. The team will ___ one from the approved drawings.",
            "answers": [
              "construct"
            ],
            "clue": "Check the verb form and any required small words against the sentence around the gap.",
            "why": "Construct names the building action; construction would not fit this verb slot.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        }
      ],
      "context": [
        {
          "senseId": "sense-aca45c8c33ce6d6b76305b9d",
          "sourceId": "C17-T1-R1-031",
          "sentence": "The classes currently meet in an inner-city room in fictional Rowan."
        }
      ],
      "morph": [
        {
          "senseId": "sense-58da02c350f91fff6e6e34d5",
          "form": "construction",
          "definition": "noun: the process of building a structure",
          "partOfSpeech": "noun",
          "attestationRef": "cambridge-construction",
          "discover": {
            "kind": "recall",
            "prompt": "Use the noun: The room is still under ___.",
            "answers": [
              "construction"
            ],
            "clue": "Under is followed by the process noun in this expression.",
            "why": "Under construction means being built.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "transform": {
            "kind": "recall",
            "prompt": "Transform the verb into a noun: They will construct the hall. The ___ of the hall will begin soon.",
            "answers": [
              "construction"
            ],
            "clue": "Name the building process after the.",
            "why": "Construction is the noun for the building process.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "recall": {
            "kind": "recall",
            "prompt": "Builders are still putting up the new library. Access is restricted during ___.",
            "answers": [
              "construction"
            ],
            "clue": "Name the process, not the person doing it.",
            "why": "Construction names the building process in this noun position.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "extra": {
            "kind": "recall",
            "prompt": "The empty plot will become a sports hall. Work begins next month, and ___ will take a year.",
            "answers": [
              "construction"
            ],
            "clue": "A process noun follows during.",
            "why": "Construction fits after during; construct is the base verb.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          }
        }
      ],
      "contentHistory": [
        {
          "version": 1,
          "terms": [
            {
              "senseId": "sense-0565f5e877495423f1f8e0ea",
              "sourceId": "C17-T1-R1-015",
              "term": "overcrowded",
              "definition": "having too many people",
              "sentence": "In fictional Rowan, the evening classroom is overcrowded.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which interpretation fits overcrowded?",
                "options": [
                  "Too many people are using the space.",
                  "The room has too many empty seats.",
                  "The building has been permanently closed."
                ],
                "answer": 0,
                "clue": "Compare the number of people with the available space.",
                "why": "Overcrowded means there are too many people for the space; it does not mean that the building is closed.",
                "context": "The attendance note says there are more learners than the room can comfortably hold.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Complete the note: The small room is ___.",
                "options": [
                  "overcrowded",
                  "overcrowd",
                  "overcrowding people"
                ],
                "answer": 0,
                "clue": "Describe the room after is.",
                "why": "Overcrowded is the adjective that describes a space containing too many people.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the adjective: With every aisle blocked by visitors, the gallery was ___.",
                "answers": [
                  "overcrowded"
                ],
                "clue": "Describe a space containing too many people.",
                "why": "Overcrowded describes the gallery, not an action performed by a visitor.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-3d666ffd6243e5eae8122ec5",
              "sourceId": "C17-T1-R1-030",
              "term": "relocate",
              "definition": "move to a new place",
              "sentence": "With the learners’ agreement, the organisers plan to relocate the classes.",
              "investigate": {
                "kind": "meaning",
                "prompt": "What does relocate describe?",
                "options": [
                  "Cancel the classes without replacing them.",
                  "Move them to a new place.",
                  "Keep them in exactly the same room."
                ],
                "answer": 1,
                "clue": "Look for a change of place, not a cancellation.",
                "why": "Relocate means move to a new place; it does not by itself mean cancel or end the activity.",
                "context": "The organisers intend to move the classes from their current room to a different site.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "We",
                  "relocate",
                  "classes",
                  "month.",
                  "will",
                  "the",
                  "next"
                ],
                "answers": [
                  "We will relocate the classes next month."
                ],
                "clue": "Start with who will make the move.",
                "why": "Relocate takes the classes as its object in this memo.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the base verb: The club plans to ___ its meetings to a larger hall.",
                "answers": [
                  "relocate"
                ],
                "clue": "The gap follows to and describes a change of place.",
                "why": "Relocate is the base verb needed after plans to.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-671cec8bff9f6329a6dbfc5e",
              "sourceId": "C17-T1-R1-033",
              "term": "suburb",
              "definition": "residential area outside city centre",
              "sentence": "The chosen suburb has a site beside an existing bus stop.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which description matches suburb?",
                "options": [
                  "The main city of a country.",
                  "An underground service tunnel.",
                  "A residential area beyond the city centre."
                ],
                "answer": 2,
                "clue": "Focus on the residential location relative to the centre.",
                "why": "Suburb refers to a residential area outside the city centre; capital and tunnel refer to different concepts.",
                "context": "The location note describes a residential area outside the city centre.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "paraphrase",
                "prompt": "Which site note keeps the meaning?",
                "options": [
                  "The hall is in a residential district outside the centre.",
                  "The hall is inside a railway engine.",
                  "The hall is the national government."
                ],
                "answer": 0,
                "clue": "Preserve both the residential character and the location.",
                "why": "The residential district outside the centre is a suburb.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the singular location noun: The new hall stands in a quiet ___ outside the city centre.",
                "answers": [
                  "suburb"
                ],
                "clue": "Name the residential area rather than the building.",
                "why": "Suburb names the residential area; hall names the building in it.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-d6d03481b171a5f596024d5b",
              "sourceId": "C17-T1-R1-034",
              "term": "provide",
              "definition": "make available",
              "sentence": "The council will provide the site for the classes.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which action does provide describe?",
                "options": [
                  "Take the space away from the organisers.",
                  "Make the space available to them.",
                  "Ignore every request for space."
                ],
                "answer": 1,
                "clue": "Consider whether the organisers gain access to the resource.",
                "why": "Provide means make something available, as the council does with the site in the memo.",
                "context": "A council memo makes the space available for the organisers to use.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "The",
                  "will",
                  "space",
                  "the",
                  "council",
                  "provide",
                  "for",
                  "classes."
                ],
                "answers": [
                  "The council will provide space for the classes."
                ],
                "clue": "Place the resource after the action.",
                "why": "Provide space for states what is made available and who it is for.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the base verb: The school will ___ tables for the workshop.",
                "answers": [
                  "provide"
                ],
                "clue": "The gap names the action of making a resource available.",
                "why": "Provide fits after will; tables is the resource being made available.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-58da02c350f91fff6e6e34d5",
              "sourceId": "C17-T1-R1-043",
              "term": "construct",
              "definition": "build something",
              "sentence": "Volunteers will construct a larger community room there.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which action matches construct?",
                "options": [
                  "Remove the room without replacement.",
                  "Rename a room without building work.",
                  "Build the planned room."
                ],
                "answer": 2,
                "clue": "Distinguish making the structure from naming or removing it.",
                "why": "Construct means build; it does not mean demolish or merely rename.",
                "context": "The final proposal describes building a room on the chosen site.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Complete the memo: The team plans to ___ a new room.",
                "options": [
                  "construction",
                  "construct",
                  "constructs"
                ],
                "answer": 1,
                "clue": "The gap follows plans to and precedes an object.",
                "why": "Construct is the base verb after to; construction is the process noun.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the base verb for build: The team will ___ a small shelter beside the hall.",
                "answers": [
                  "construct"
                ],
                "clue": "A base verb follows will.",
                "why": "Construct names the building action; construction would not fit this verb slot.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            }
          ],
          "morph": [
            {
              "senseId": "sense-58da02c350f91fff6e6e34d5",
              "form": "construction",
              "definition": "noun: the process of building a structure",
              "partOfSpeech": "noun",
              "attestationRef": "cambridge-construction",
              "discover": {
                "kind": "recall",
                "prompt": "Use the noun: The room is still under ___.",
                "answers": [
                  "construction"
                ],
                "clue": "Under is followed by the process noun in this expression.",
                "why": "Under construction means being built.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "transform": {
                "kind": "recall",
                "prompt": "Transform the verb into a noun: They will construct the hall. The ___ of the hall will begin soon.",
                "answers": [
                  "construction"
                ],
                "clue": "Name the building process after the.",
                "why": "Construction is the noun for the building process.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "recall": {
                "kind": "recall",
                "prompt": "Independent recall: The committee approved the ___ of a new shelter.",
                "answers": [
                  "construction"
                ],
                "clue": "Name the process, not the person doing it.",
                "why": "Construction names the building process in this noun position.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "extra": {
                "kind": "recall",
                "prompt": "One more context: During ___, the classes met elsewhere.",
                "answers": [
                  "construction"
                ],
                "clue": "A process noun follows during.",
                "why": "Construction fits after during; construct is the base verb.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              }
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": 1,
      "id": "p1-power-exhibit",
      "version": 2,
      "lessonId": "cam17-t1-reading-p1",
      "theme": "Museum editors check a fictional model-engine exhibit",
      "title": "The Power Exhibit Review",
      "briefing": "You are editing a fictional museum display about model power systems. Check the archive captions, distinguish processes from devices, and write a precise editorial note. No experiment or live engineering action is requested.",
      "debrief": "The curators now have more precise captions for the fictional exhibit. Keep process nouns separate from verbs and do not treat the case as practical engineering instructions.",
      "visual": "energy",
      "publication": "draft",
      "review": {
        "status": "TEACHER_REVIEW",
        "approvedBy": null,
        "approvedAt": null,
        "approvedVersion": null,
        "rubric": {
          "grammar": "TEACHER_REVIEW",
          "sourceSense": "TEACHER_REVIEW",
          "collocations": "TEACHER_REVIEW",
          "uniqueKey": "TEACHER_REVIEW",
          "distractors": "TEACHER_REVIEW",
          "hints": "TEACHER_REVIEW",
          "recallVariants": "TEACHER_REVIEW",
          "morph": "TEACHER_REVIEW",
          "narrative": "TEACHER_REVIEW",
          "rights": "TEACHER_REVIEW"
        },
        "draftOrigin": "offline_ai_assisted_original_text",
        "technicalValidation": "run validator; never substitutes for teacher approval"
      },
      "rights": {
        "origin": "original_offline_authored",
        "copiedCambridgePassage": false,
        "externalArtwork": false
      },
      "terms": [
        {
          "senseId": "sense-b9b6507069769c823a393841",
          "sourceId": "C17-T1-R1-055",
          "term": "emission",
          "definition": "substances released by engines",
          "sentence": "The exhibit log describes an emission of exhaust from an old engine.",
          "investigate": {
            "kind": "meaning",
            "prompt": "What does emission refer to here?",
            "options": [
              "A substance released from the engine.",
              "A substance supplied to the engine as fuel.",
              "A substance retained inside the engine as lubricant."
            ],
            "answer": 0,
            "clue": "Trace the direction of the material in the engine note.",
            "why": "The emission leaves the engine. Fuel enters it, while lubricant retained inside has not been released.",
            "context": "An archive note records material released from the engine during operation.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Which wording fits the engine note?",
            "options": [
              "an emission of exhaust",
              "an admission of exhaust",
              "a permission of exhaust"
            ],
            "answer": 0,
            "clue": "Choose the noun that names material released by an engine.",
            "why": "An emission of exhaust describes a release; admission and permission have different meanings.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The monitor detected an ___ of nitrogen oxides from the engine while it was running.",
            "answers": [
              "emission"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "An emission of nitrogen oxides identifies material released by the engine; the article an requires a singular noun here.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-76ab40715a668211f31eca6c",
          "sourceId": "C17-T1-R1-062",
          "term": "minimise",
          "definition": "reduce as far as possible",
          "sentence": "The curators want to minimise wasted electricity during opening hours.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which aim matches minimise?",
            "options": [
              "Keep the current level of waste unchanged.",
              "Reduce waste as far as possible.",
              "Move the waste elsewhere without reducing it."
            ],
            "answer": 1,
            "clue": "Consider the intended change in the amount of waste.",
            "why": "Minimise means reduce as far as possible; it is stronger than simply renaming a measure.",
            "context": "The review asks for waste to be reduced as far as possible.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "We",
              "to",
              "waste",
              "the",
              "aim",
              "minimise",
              "during",
              "display."
            ],
            "answers": [
              "We aim to minimise waste during the display."
            ],
            "clue": "Start with the team aim, then the action and object.",
            "why": "Minimise waste names the aim of reducing waste as far as possible.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "The organiser checked every stage of the schedule to ___ unnecessary waiting time.",
            "answers": [
              "minimise",
              "minimize"
            ],
            "clue": "Check the verb form and any required small words against the sentence around the gap.",
            "why": "Minimise and minimize are accepted British/American spellings in this base-verb slot.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-06c262095128f7725da31684",
          "sourceId": "C17-T1-R1-084",
          "term": "condense",
          "definition": "change from gas to liquid",
          "sentence": "A diagram shows water vapour cooling until it can condense into liquid.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which change is described by condense?",
            "options": [
              "A liquid changing into a gas.",
              "A solid changing into a liquid.",
              "A gas changing into a liquid."
            ],
            "answer": 2,
            "clue": "Follow the initial and final states in the diagram.",
            "why": "Condense in this source sense means change from gas to liquid; the reverse change is not the target meaning.",
            "context": "The diagram follows a substance changing from gas to liquid.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "collocation",
            "prompt": "Complete the diagram caption: Vapour may condense ___ liquid.",
            "options": [
              "from",
              "into",
              "away"
            ],
            "answer": 1,
            "clue": "The following phrase identifies the resulting state.",
            "why": "Condense into introduces the resulting liquid state.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "Warm vapour touches the cold pane and droplets begin to appear. The vapour can ___ on the glass.",
            "answers": [
              "condense"
            ],
            "clue": "Check the verb form and any required small words against the sentence around the gap.",
            "why": "Condense is the base verb here; condensation is the process noun.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-d34dd630d6328faba29a8732",
          "sourceId": "C17-T1-R1-095",
          "term": "generator",
          "definition": "device producing electric power",
          "sentence": "A small generator produces electricity for the model display.",
          "investigate": {
            "kind": "meaning",
            "prompt": "Which description fits generator?",
            "options": [
              "A device that produces electrical power.",
              "A device that stores electricity for later use.",
              "A device that uses electricity to produce movement."
            ],
            "answer": 0,
            "clue": "Consider the device’s stated function in this display.",
            "why": "The generator produces electricity; storing electricity or using it to create motion describes different devices.",
            "context": "The label identifies a device whose role is to produce electrical power.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "reconstruct",
            "prompt": "Restore the team memo.",
            "tokens": [
              "The",
              "supplies",
              "to",
              "model.",
              "generator",
              "electricity",
              "the"
            ],
            "answers": [
              "The generator supplies electricity to the model."
            ],
            "clue": "Start with the device and then describe its role.",
            "why": "Generator is the subject; supplies electricity states its role in this display.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "During the power cut, a portable ___ produced electricity for the emergency lights.",
            "answers": [
              "generator"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Generator identifies the electricity-producing device in this sentence.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        },
        {
          "senseId": "sense-1a95bb111e4aea4c24356619",
          "sourceId": "C17-T1-R1-099",
          "term": "power supply",
          "definition": "supply of electric energy",
          "sentence": "The team checks the power supply before opening the display to visitors.",
          "investigate": {
            "kind": "meaning",
            "prompt": "What does power supply refer to here?",
            "options": [
              "The electricity consumed by one component.",
              "The electrical energy supplied to the exhibit.",
              "The electrical capacity printed on a device."
            ],
            "answer": 1,
            "clue": "Consider what the equipment needs before it can operate.",
            "why": "The note concerns electrical energy delivered to the exhibit, rather than a component’s consumption or its stated capacity.",
            "context": "The review note concerns the supply of electrical energy to the exhibit.",
            "artifact": "Case evidence",
            "purpose": "Interpret this finding before writing the team recommendation.",
            "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
          },
          "decode": {
            "kind": "paraphrase",
            "prompt": "Which memo preserves the finding that the power supply stopped?",
            "options": [
              "Electrical energy was still arriving but consumption rose.",
              "The equipment remained connected but demand fell.",
              "Electrical energy was no longer supplied."
            ],
            "answer": 2,
            "clue": "Keep the same electrical event.",
            "why": "An interruption means energy stopped reaching the equipment, not merely that demand or consumption changed.",
            "artifact": "Team language memo",
            "purpose": "Keep the wording consistent with this mission finding."
          },
          "final": {
            "kind": "recall",
            "prompt": "No electricity was reaching the equipment. The technicians restored the ___ before restarting it.",
            "answers": [
              "power supply"
            ],
            "clue": "Check the article, number and any required small words on both sides of the gap.",
            "why": "Power supply is the target two-word expression; power alone does not specify the supply.",
            "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
            "artifact": "Independent final note",
            "purpose": "Recall the expression in a new finding without a word bank.",
            "strictVariants": true
          }
        }
      ],
      "context": [
        {
          "senseId": "sense-10a3c19d3da3376f06c85142",
          "sourceId": "C17-T1-R1-080",
          "sentence": "The fictional museum is editing an exhibit about a steam locomotive."
        },
        {
          "senseId": "sense-cca21aed3e608f5b4ff5add2",
          "sourceId": "C17-T1-R1-081",
          "sentence": "An archive diagram labels the engine’s boiler."
        }
      ],
      "morph": [
        {
          "senseId": "sense-06c262095128f7725da31684",
          "form": "condensation",
          "definition": "noun: the process of a gas becoming liquid",
          "partOfSpeech": "noun",
          "attestationRef": "cambridge-condensation",
          "discover": {
            "kind": "recall",
            "prompt": "Use the noun: The diagram labels the gas-to-liquid process as ___.",
            "answers": [
              "condensation"
            ],
            "clue": "Name the process rather than give its verb.",
            "why": "Condensation is the noun for the process; condense is the verb.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "transform": {
            "kind": "recall",
            "prompt": "Transform the verb into a noun: Vapour can condense. The process is called ___.",
            "answers": [
              "condensation"
            ],
            "clue": "Use the process noun after called.",
            "why": "Condensation names the gas-to-liquid process.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "recall": {
            "kind": "recall",
            "prompt": "Water droplets formed when warm air met the cold window. This process is called ___.",
            "answers": [
              "condensation"
            ],
            "clue": "Name the phase-change process.",
            "why": "Condensation is the process noun in this context.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          },
          "extra": {
            "kind": "recall",
            "prompt": "Warm water vapour cooled against the mirror and formed droplets through ___.",
            "answers": [
              "condensation"
            ],
            "clue": "A noun names the process being labelled.",
            "why": "Condensation names the process represented by the cooling vapour.",
            "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
            "strictVariants": true
          }
        }
      ],
      "contentHistory": [
        {
          "version": 1,
          "terms": [
            {
              "senseId": "sense-b9b6507069769c823a393841",
              "sourceId": "C17-T1-R1-055",
              "term": "emission",
              "definition": "substances released by engines",
              "sentence": "The exhibit log describes an emission of exhaust from an old engine.",
              "investigate": {
                "kind": "meaning",
                "prompt": "What does emission refer to here?",
                "options": [
                  "A substance released from the engine.",
                  "The price paid for the engine.",
                  "The number of passengers in a carriage."
                ],
                "answer": 0,
                "clue": "Identify what leaves the engine, rather than its cost or users.",
                "why": "Emission in this engine context refers to substances released by it; the source sense is not about a fare or passenger count.",
                "context": "An archive note records material released from the engine during operation.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Which wording fits the engine note?",
                "options": [
                  "an emission of exhaust",
                  "an admission of exhaust",
                  "a permission of exhaust"
                ],
                "answer": 0,
                "clue": "Choose the noun that names material released by an engine.",
                "why": "An emission of exhaust describes a release; admission and permission have different meanings.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the singular release noun: The monitor recorded an ___ from the engine.",
                "answers": [
                  "emission"
                ],
                "clue": "The gap follows an and names a release from the engine.",
                "why": "Emission is the singular noun for the recorded release.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-76ab40715a668211f31eca6c",
              "sourceId": "C17-T1-R1-062",
              "term": "minimise",
              "definition": "reduce as far as possible",
              "sentence": "The curators want to minimise wasted electricity during opening hours.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which aim matches minimise?",
                "options": [
                  "Make waste larger at every opportunity.",
                  "Reduce waste as far as possible.",
                  "Rename the same amount of waste."
                ],
                "answer": 1,
                "clue": "Compare the quantity of waste before and after the proposed change.",
                "why": "Minimise means reduce as far as possible; it is stronger than simply renaming a measure.",
                "context": "The review asks for waste to be reduced as far as possible.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "We",
                  "to",
                  "waste",
                  "the",
                  "aim",
                  "minimise",
                  "during",
                  "display."
                ],
                "answers": [
                  "We aim to minimise waste during the display."
                ],
                "clue": "Start with the team aim, then the action and object.",
                "why": "Minimise waste names the aim of reducing waste as far as possible.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the base verb: Careful planning can ___ unnecessary delay.",
                "answers": [
                  "minimise",
                  "minimize"
                ],
                "clue": "The action reduces the delay as far as possible.",
                "why": "Minimise and minimize are accepted British/American spellings in this base-verb slot.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-06c262095128f7725da31684",
              "sourceId": "C17-T1-R1-084",
              "term": "condense",
              "definition": "change from gas to liquid",
              "sentence": "A diagram shows water vapour cooling until it can condense into liquid.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which change is described by condense?",
                "options": [
                  "A liquid turning into a gas.",
                  "A solid becoming a larger solid.",
                  "A gas changing into a liquid."
                ],
                "answer": 2,
                "clue": "Follow the direction of the change, not just the presence of heat.",
                "why": "Condense in this source sense means change from gas to liquid; the reverse change is not the target meaning.",
                "context": "The diagram follows a substance changing from gas to liquid.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "collocation",
                "prompt": "Complete the diagram caption: Vapour may condense ___ liquid.",
                "options": [
                  "from",
                  "into",
                  "away"
                ],
                "answer": 1,
                "clue": "The following phrase identifies the resulting state.",
                "why": "Condense into introduces the resulting liquid state.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the base verb: On a cooler surface, the vapour can ___ into liquid.",
                "answers": [
                  "condense"
                ],
                "clue": "The gap follows can and describes the gas-to-liquid change.",
                "why": "Condense is the base verb here; condensation is the process noun.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-d34dd630d6328faba29a8732",
              "sourceId": "C17-T1-R1-095",
              "term": "generator",
              "definition": "device producing electric power",
              "sentence": "A small generator produces electricity for the model display.",
              "investigate": {
                "kind": "meaning",
                "prompt": "Which description fits generator?",
                "options": [
                  "A device that produces electrical power.",
                  "A ticket used to enter the museum.",
                  "A place where passengers wait."
                ],
                "answer": 0,
                "clue": "Focus on the device’s stated output.",
                "why": "The approved generator sense is a device producing electric power, not a ticket or waiting area.",
                "context": "The label identifies a device whose role is to produce electrical power.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "reconstruct",
                "prompt": "Restore the team memo.",
                "tokens": [
                  "The",
                  "supplies",
                  "to",
                  "model.",
                  "generator",
                  "electricity",
                  "the"
                ],
                "answers": [
                  "The generator supplies electricity to the model."
                ],
                "clue": "Start with the device and then describe its role.",
                "why": "Generator is the subject; supplies electricity states its role in this display.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Use the device noun: A portable ___ produced electricity for the temporary lights.",
                "answers": [
                  "generator"
                ],
                "clue": "Name the device that produces electric power.",
                "why": "Generator identifies the electricity-producing device in this sentence.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            },
            {
              "senseId": "sense-1a95bb111e4aea4c24356619",
              "sourceId": "C17-T1-R1-099",
              "term": "power supply",
              "definition": "supply of electric energy",
              "sentence": "The team checks the power supply before opening the display to visitors.",
              "investigate": {
                "kind": "meaning",
                "prompt": "What does power supply refer to here?",
                "options": [
                  "The opinions expressed by visitors.",
                  "The electrical energy supplied to the exhibit.",
                  "The number of seats beside the display."
                ],
                "answer": 1,
                "clue": "Keep the electrical sense rather than a social meaning of power.",
                "why": "Power supply here means the supply of electric energy; it is not authority, popularity or seating capacity.",
                "context": "The review note concerns the supply of electrical energy to the exhibit.",
                "artifact": "Case evidence",
                "purpose": "Interpret this finding before writing the team recommendation.",
                "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
              },
              "decode": {
                "kind": "paraphrase",
                "prompt": "Which memo preserves the finding that the power supply stopped?",
                "options": [
                  "Visitors changed their opinions.",
                  "Extra seats were added.",
                  "Electrical energy was no longer supplied."
                ],
                "answer": 2,
                "clue": "Keep the same electrical event.",
                "why": "The third memo describes an interruption to the power supply; the others describe unrelated events.",
                "artifact": "Team language memo",
                "purpose": "Keep the wording consistent with this mission finding."
              },
              "final": {
                "kind": "recall",
                "prompt": "Write the two-word expression: After the interruption, the technicians restored the ___.",
                "answers": [
                  "power supply"
                ],
                "clue": "Name what provides the display with electrical energy.",
                "why": "Power supply is the target two-word expression; power alone does not specify the supply.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
                "artifact": "Independent final note",
                "purpose": "Recall the expression in a new finding without a word bank."
              }
            }
          ],
          "morph": [
            {
              "senseId": "sense-06c262095128f7725da31684",
              "form": "condensation",
              "definition": "noun: the process of a gas becoming liquid",
              "partOfSpeech": "noun",
              "attestationRef": "cambridge-condensation",
              "discover": {
                "kind": "recall",
                "prompt": "Use the noun: The diagram labels the gas-to-liquid process as ___.",
                "answers": [
                  "condensation"
                ],
                "clue": "Name the process rather than give its verb.",
                "why": "Condensation is the noun for the process; condense is the verb.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "transform": {
                "kind": "recall",
                "prompt": "Transform the verb into a noun: Vapour can condense. The process is called ___.",
                "answers": [
                  "condensation"
                ],
                "clue": "Use the process noun after called.",
                "why": "Condensation names the gas-to-liquid process.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "recall": {
                "kind": "recall",
                "prompt": "Independent recall: In the diagram, cooling vapour leads to ___.",
                "answers": [
                  "condensation"
                ],
                "clue": "Name the phase-change process.",
                "why": "Condensation is the process noun in this context.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              },
              "extra": {
                "kind": "recall",
                "prompt": "One more context: The editor added a label for ___ beside the liquid drops.",
                "answers": [
                  "condensation"
                ],
                "clue": "A noun names the process being labelled.",
                "why": "Condensation names the process represented by the cooling vapour.",
                "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap."
              }
            }
          ]
        }
      ]
    }
  ]
};if(typeof module!=="undefined"&&module.exports)module.exports=data;else root.MD_MISSION_PACKS=data;})(this);
