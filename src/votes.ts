import { argv } from "node:process";
import { fetchVoteData, processVote } from "./voteCommon";

// If this script is run directly, process the vote based on command-line arguments
// [-0---] [-1-] [-2----------] [-3------]
// npm run votes "${VOTE_ROOT}" "${INPUT}"
const voteRoot = argv[2];
const commentId = argv[3];

const voteData = fetchVoteData(commentId);
processVote(voteRoot, voteData);
