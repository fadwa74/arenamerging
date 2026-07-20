export const calculateElo = (winnerRating, loserRating, k = 32) => {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser  = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  return {
    newWinnerElo: winnerRating + k * (1 - expectedWinner),
    newLoserElo:  loserRating  + k * (0 - expectedLoser),
  };
};
