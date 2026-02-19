import React, { useEffect, useState } from "react";
import { Container, Grid, Typography } from "@mui/material";
import { fetchRegions } from "../api/api";
import RegionCard from "./RegionCard";
import UsageChart from "./UsageChart";

const Dashboard = () => {
  const [regions, setRegions] = useState([]);

  const loadData = async () => {
    const res = await fetchRegions();
    setRegions(res.data);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        AI Electrical Grid Optimization Dashboard
      </Typography>

      <UsageChart regions={regions} />

      <Grid container spacing={3} marginTop={2}>
        {regions.map(region => (
          <Grid item xs={12} md={4} key={region.id}>
            <RegionCard region={region} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;
