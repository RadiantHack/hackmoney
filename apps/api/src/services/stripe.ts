/**
 * Generates a virtual card with BIN number using regex pattern
 * BIN (Bank Identification Number) - first 6 digits of card
 * Format: XXXXXX XXXX XXXX XXXX
 */
export const generateBinCardWithAtm = async (
  _customerId?: string
): Promise<{
  cardId: string;
  cardNumber: string;
  cardBrand: string;
  bin: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvv: string;
  cardPin: string;
  cardType: "ATM" | "VIRTUAL";
}> => {
  try {
    const bin = generateRandomBin();
    const cardNumber = generateCardNumber(bin);
    const cardLast4 = cardNumber.substring(cardNumber.length - 4);
    const currentYear = new Date().getFullYear();

    return {
      cardId: `card_${generateRandomString(24)}`,
      cardNumber: cardNumber,
      cardBrand: "Visa",
      bin: bin,
      cardLast4: cardLast4,
      cardExpMonth: 12,
      cardExpYear: currentYear + 3,
      cardCvv: generateCvv(),
      cardPin: generatePin(),
      cardType: "ATM",
    };
  } catch (error) {
    console.error("Error generating BIN card:", error);
    throw error;
  }
};

/**
 * Generate a virtual card
 */
export const generateVirtualCard = async (): Promise<{
  cardId: string;
  cardNumber: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvv: string;
}> => {
  const cardNumber = generateCardNumber();
  const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
  const currentYear = new Date().getFullYear();

  return {
    cardId: `card_${generateRandomString(24)}`,
    cardNumber: cardNumber,
    cardBrand: "Visa",
    cardLast4: cardLast4,
    cardExpMonth: 12,
    cardExpYear: currentYear + 3,
    cardCvv: generateCvv(),
  };
};

/**
 * Generate a random BIN (Bank Identification Number) using regex
 * BIN format: 6 digits starting with Visa prefix (4 or 5)
 * Regex: /^[45][0-9]{5}$/
 */
const generateRandomBin = (): string => {
  const visaPrefix = ["4", "5"][Math.floor(Math.random() * 2)];
  const remainingDigits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  const bin = visaPrefix + remainingDigits;

  // Validate with regex: 6 digits starting with 4 or 5
  const binRegex = /^[45]\d{5}$/;
  if (!binRegex.test(bin)) {
    return generateRandomBin(); // Recursive fallback
  }

  return bin;
};

/**
 *
 *
 * Generate a card number with valid format (16 digits, space-separated )
 * Format: XXXX XXXX XXXX XXXX
 * Uses regex validation pattern: /^\d{4} \d{4} \d{4} \d{4}$/
 */
const generateCardNumber = (bin?: string): string => {
  const binNumber = bin || generateRandomBin();
  const remainingDigits = Array.from({ length: 10 })
    .map(() => Math.floor(Math.random() * 10))
    .join("");

  // Build card number with 16 digits total
  const fullCardNumber = binNumber + remainingDigits;

  // Format as: XXXX XXXX XXXX XXXX
  const formatted = fullCardNumber.match(/\d{4}/g)?.join(" ") || fullCardNumber;

  // Validate with regex
  const cardNumberRegex = /^\d{4} \d{4} \d{4} \d{4}$/;
  if (!cardNumberRegex.test(formatted)) {
    return generateCardNumber(bin);
  }

  return formatted;
};

/**
 *
 * Generate a random CVV
 */
const generateCvv = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

/**
 * Generate a 4-digit PIN for ATM card
 */
const generatePin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 *
 * Generate a random string for IDs, maybe use a pre-build library
 */

const generateRandomString = (length: number): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 *
 * Get card details
 */
export const getCardDetails = async () => {
  return null;
};

export default null;
