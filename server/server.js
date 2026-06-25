const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// TU API KEY
const API_KEY = "7f97b0c706de4be5a07706141ff37ea0";

// Partidos históricos de una selección
app.get("/team/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/teams/${req.params.id}/matches?status=FINISHED`,
      {
        headers: {
          "X-Auth-Token": API_KEY,
        },
      }
    );

    res.json(response.data.matches || []);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json([]);
  }
});

// Partidos de Copa del Mundo
app.get("/worldcup/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/teams/${req.params.id}/matches?competitions=WC&status=FINISHED`,
      {
        headers: {
          "X-Auth-Token": API_KEY,
        },
      }
    );

    res.json(response.data.matches || []);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json([]);
  }
});

// Selecciones disponibles
app.get("/teams", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/teams",
      {
        headers: {
          "X-Auth-Token": API_KEY,
        },
      }
    );

    res.json(response.data.teams || []);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json([]);
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor World Cup corriendo en puerto ${PORT}`);
});